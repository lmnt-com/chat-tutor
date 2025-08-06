import Lmnt from "lmnt-node";
import OpenAI from "openai";
import { Stream } from "openai/core/streaming.mjs";
import { FrameBuilder, Message, StreamFrame } from "../types";
import { Thread } from "./thread";
import { SentenceBuffer } from "../sentence-buffer";
import { PromiseQueue } from "../promise-queue";
import { CharacterId, getCharacter } from "../characters";

export class StreamingManager {
  private controller: ReadableStreamDefaultController<Uint8Array>;
  private encoder = new TextEncoder();
  private lmnt: Lmnt;
  private messages: Message[];
  private openai: OpenAI;
  private thread: Thread;
  private userId: string | null;
  private messageId: string | null;

  constructor(
    openai: OpenAI,
    lmnt: Lmnt,
    controller: ReadableStreamDefaultController<Uint8Array>,
    threadId: string | null,
    userId: string | null,
    messages: Message[],
    messageId: string | null = null,
  ) {
    this.controller = controller;
    this.lmnt = lmnt;
    this.messages = messages;
    this.openai = openai;
    this.thread = new Thread(threadId);
    this.userId = userId;
    this.messageId = messageId;
  }

  async streamWithSpeech(
    messages: Message[],
    systemPrompt: string,
    characterId: CharacterId,
    imageGenerationEnabled: boolean = true,
  ) {
    try {
      this.sendFrame(FrameBuilder.status("started", "Generating response"));

      const openaiStream = await this.openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        temperature: 0.7,
      });

      this.sendFrame(FrameBuilder.status("processing", "Generating response"));

      const audioPromiseQueue = new PromiseQueue<{
        audio: string;
        sentenceId: string;
      }>();

      // Process text stream and audio concurrently
      await Promise.all([
        this.processTextStream(
          openaiStream,
          characterId,
          audioPromiseQueue,
          imageGenerationEnabled,
        ),
        this.processAudioQueue(audioPromiseQueue),
      ]);
    } catch (error) {
      console.error("Streaming error:", error);
      this.sendFrame(FrameBuilder.status("error", (error as Error).message));
      throw error;
    }
  }

  /**
   * Processes the text stream from OpenAI and sends it to LMNT for speech synthesis
   * @param openaiStream - The stream of text chunks from OpenAI.
   * @param voice - The voice to use for the speech.
   * @param audioPromiseQueue - The queue of audio promises.
   */
  private async processTextStream(
    openaiStream: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>,
    characterId: CharacterId,
    audioPromiseQueue: PromiseQueue<{ audio: string; sentenceId: string }>,
    imageGenerationEnabled: boolean,
  ) {
    let fullResponse = "";
    const character = getCharacter(characterId);

    const sentenceBuffer = new SentenceBuffer(
      (sentenceId: string, start: number, end: number, sentence: string) => {
        audioPromiseQueue.add(
          this.generateSpeechForSentenceWithId(
            sentence,
            character.voice,
            sentenceId,
          ),
        );

        // Send sentence boundary frame to client
        this.sendFrame(FrameBuilder.sentenceBoundary(sentenceId, start, end));
      },
    );

    for await (const chunk of openaiStream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;

        // Send text frame to client immediately to be displayed
        this.sendFrame(FrameBuilder.text(content));

        // SentenceBuffer will send complete sentences to LMNT as they are ready
        sentenceBuffer.addText(content);
      }
    }

    // Process any remaining text in the buffer
    sentenceBuffer.flush();

    // Signal that no more audio promises will be added
    audioPromiseQueue.markComplete();

    const shouldGenerateImage = await this.shouldGenerateImage(
      fullResponse,
      characterId,
    );
    if (shouldGenerateImage.generate && imageGenerationEnabled) {
      this.sendFrame(
        FrameBuilder.status("generating_image", "Generating image..."),
      );
    }
    this.sendFrame(FrameBuilder.status("completed", "Response complete"));

    await Promise.all([
      shouldGenerateImage.generate &&
      shouldGenerateImage.prompt &&
      this.messageId &&
      imageGenerationEnabled
        ? this.generateAndSendImage(shouldGenerateImage.prompt, this.messageId)
        : Promise.resolve(),

      this.generateSuggestedResponses(fullResponse, characterId),
    ]);

    // Save the full response to the database (text only)
    await this.thread.save(this.userId, this.messages, fullResponse);
  }

  /**
   * Generates speech for a sentence and returns the audio data as a base64 string with sentence ID
   * @param sentence - The sentence to generate speech for.
   * @param voice - The voice to use for the speech.
   * @param sentenceId - The ID of the sentence for correlation.
   * @returns A promise that resolves to an object with audio data and sentence ID.
   */
  private async generateSpeechForSentenceWithId(
    sentence: string,
    voice: string,
    sentenceId: string,
  ): Promise<{ audio: string; sentenceId: string }> {
    try {
      const speechResponse = await this.lmnt.speech.generate({
        text: sentence,
        voice,
        language: "en",
      });
      const audioBlob = await speechResponse.blob();
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString("base64");
      return { audio: audioBase64, sentenceId };
    } catch (error) {
      console.error("Error generating speech for sentence:", error);
      throw error;
    }
  }

  /**
   * Sends audio data to the client as it is ready
   * @param audioPromiseQueue - The queue of audio promises.
   */
  private async processAudioQueue(
    audioPromiseQueue: PromiseQueue<{ audio: string; sentenceId: string }>,
  ): Promise<void> {
    await audioPromiseQueue.process(
      (audioData) => {
        this.sendFrame(
          FrameBuilder.audio(audioData.audio, 24000, audioData.sentenceId),
        );
      },
      (error, index) => {
        console.error(`Error processing audio at index ${index}:`, error);
      },
    );
  }

  /**
   * Generates suggested responses using a separate LLM call and sends them to the client
   * @param assistantResponse - The assistant's response that was just generated
   * @param characterId - The character ID (used to determine character context)
   */
  private async generateSuggestedResponses(
    assistantResponse: string,
    characterId: CharacterId,
  ) {
    try {
      // Build the conversation context for the suggestions call
      const conversationContext = [
        ...this.messages,
        { role: "assistant" as const, content: assistantResponse },
      ];

      // Get the character's suggestions prompt
      const character = getCharacter(characterId);
      const suggestionsPrompt = character.suggestionsPrompt;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: suggestionsPrompt },
          ...conversationContext,
          {
            role: "user" as const,
            content:
              "Based on our conversation so far, suggest 3 natural follow-up questions I might ask. Return only the 3 questions, one per line, without numbers or formatting.",
          },
        ],
        temperature: 0.8,
        max_tokens: 150,
      });

      const suggestionsText = response.choices[0]?.message?.content || "";
      const suggestions = suggestionsText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, 3); // Ensure we only take 3 suggestions

      if (suggestions.length > 0) {
        this.sendFrame(FrameBuilder.suggestedResponses(suggestions));
      }
    } catch (error) {
      console.error("Error generating suggested responses:", error);
    }
  }

  /**
   * Determines if an image should be generated for the given response
   * @param response - The assistant's response
   * @param characterId - The character ID for context
   * @returns Object with generate flag and prompt if applicable
   */
  private async shouldGenerateImage(
    response: string,
    characterId: CharacterId,
  ): Promise<{ generate: boolean; prompt?: string }> {
    try {
      const character = getCharacter(characterId);

      const prompt = `You are ${character.displayName}. Based on your response about history, determine if a visual image would help enhance the learning experience.

Your response: "${response}"

If an image would be helpful, respond with:
GENERATE_IMAGE: [detailed description for DALL-E image generation, written in a style appropriate for ${character.displayName}]

If no image is needed, respond with:
NO_IMAGE

Guidelines:
- Only generate images for historical figures, events, places, artifacts, maps, or concepts that would benefit from visual representation
- Make the image description detailed but educational
- Consider your character's teaching style: ${character.description}
- Avoid generating images for abstract concepts, modern topics, or conversations that don't need visuals`;

      const imageDecision = await this.openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: "If useful, generate an image for this response.",
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const decision = imageDecision.choices[0]?.message?.content || "";

      if (decision.includes("GENERATE_IMAGE:")) {
        const imagePrompt = decision.split("GENERATE_IMAGE:")[1]?.trim();
        if (imagePrompt) {
          return { generate: true, prompt: imagePrompt };
        }
      }

      return { generate: false };
    } catch (error) {
      console.error("Error checking if image should be generated:", error);
      return { generate: false };
    }
  }

  /**
   * Generates an image and sends it to the client
   * @param prompt - The image generation prompt
   * @param messageId - The message ID to associate with the image
   */
  private async generateAndSendImage(
    prompt: string,
    messageId: string,
  ): Promise<void> {
    try {
      const response = await this.openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        stream: true,
        quality: "low",
      });

      for await (const chunk of response) {
        if (chunk.type === "image_generation.completed") {
          if (chunk.b64_json) {
            this.sendFrame(
              FrameBuilder.image(chunk.b64_json, prompt, messageId),
            );
            return;
          }
        }
      }
    } catch (error) {
      console.error("Error generating image:", error);
    }
  }

  /**
   * Sends a frame to the client immediately.
   * @param frame - The frame to send.
   */
  private sendFrame(frame: StreamFrame) {
    // Check if controller is still open
    try {
      if (this.controller.desiredSize === null) {
        console.warn("Attempted to send frame after stream closed");
        return;
      }

      const frameData = JSON.stringify(frame);
      this.controller.enqueue(this.encoder.encode(`data: ${frameData}\n\n`));
    } catch {
      console.warn("Controller already closed, skipping frame:", frame.type);
    }
  }
}
