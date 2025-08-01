import Lmnt from 'lmnt-node'
import OpenAI from 'openai'
import { Stream } from 'openai/core/streaming.mjs'
import { FrameBuilder, Message, StreamFrame } from '../types'
import { Thread } from './thread'
import { SentenceBuffer } from '../sentence-buffer'
import { PromiseQueue } from '../promise-queue'
import { CharacterId, getCharacter } from '../characters'

export class StreamingManager {
  private controller: ReadableStreamDefaultController<Uint8Array>
  private encoder = new TextEncoder()
  private lmnt: Lmnt
  private messages: Message[]
  private openai: OpenAI
  private thread: Thread
  private userId: string | null

  constructor(
    openai: OpenAI,
    lmnt: Lmnt,
    controller: ReadableStreamDefaultController<Uint8Array>,
    threadId: string | null,
    userId: string | null,
    messages: Message[]
  ) {
    this.controller = controller
    this.lmnt = lmnt
    this.messages = messages
    this.openai = openai
    this.thread = new Thread(threadId)
    this.userId = userId
  }

  async streamWithSpeech(
    messages: Message[],
    systemPrompt: string,
    characterId: CharacterId
  ) {
    try {
      this.sendFrame(FrameBuilder.status('started', 'Generating response'))

      const openaiStream = await this.openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        temperature: 0.7,
      })

      this.sendFrame(FrameBuilder.status('processing', 'Generating response'))

      const audioPromiseQueue = new PromiseQueue<{ audio: string, sentenceId: string }>()

      // Process text stream and audio concurrently
      await Promise.all([
        this.processTextStream(openaiStream, characterId, audioPromiseQueue),
        this.processAudioQueue(audioPromiseQueue)
      ])

      this.sendFrame(FrameBuilder.status('completed', 'Response complete'))

    } catch (error) {
      console.error("Streaming error:", error)
      this.sendFrame(FrameBuilder.status('error', (error as Error).message))
      throw error
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
    audioPromiseQueue: PromiseQueue<{ audio: string, sentenceId: string }>
  ) {
    let fullResponse = ""
    const character = getCharacter(characterId)
    
    const sentenceBuffer = new SentenceBuffer(
      (sentenceId: string, start: number, end: number, sentence: string) => {
        audioPromiseQueue.add(this.generateSpeechForSentenceWithId(sentence, character.voice, sentenceId))

        // Send sentence boundary frame to client
        this.sendFrame(FrameBuilder.sentenceBoundary(sentenceId, start, end))
      }
    )

    for await (const chunk of openaiStream) {
      const content = chunk.choices[0]?.delta?.content || ""
      if (content) {
        fullResponse += content
        
        // Send text frame to client immediately to be displayed
        this.sendFrame(FrameBuilder.text(content))
        
        // SentenceBuffer will send complete sentences to LMNT as they are ready
        sentenceBuffer.addText(content)
      }
    }

    // Process any remaining text in the buffer
    sentenceBuffer.flush()

    // Signal that no more audio promises will be added
    audioPromiseQueue.markComplete()

    // Generate suggested responses with a separate LLM call
    const suggestedResponses = await this.generateSuggestedResponses(fullResponse, characterId)
    
    // Send suggested responses if any were generated
    if (suggestedResponses.length > 0) {
      this.sendFrame(FrameBuilder.suggestedResponses(suggestedResponses))
    }

    // Save the full response to the database
    await this.thread.save(
      this.userId,
      this.messages,
      fullResponse
    )
  }

  /**
   * Generates speech for a sentence and returns the audio data as a base64 string with sentence ID
   * @param sentence - The sentence to generate speech for.
   * @param voice - The voice to use for the speech.
   * @param sentenceId - The ID of the sentence for correlation.
   * @returns A promise that resolves to an object with audio data and sentence ID.
   */
  private async generateSpeechForSentenceWithId(sentence: string, voice: string, sentenceId: string): Promise<{ audio: string, sentenceId: string }> {
    try {
      const speechResponse = await this.lmnt.speech.generate({
        text: sentence,
        voice,
        language: 'en',
      })
      const audioBlob = await speechResponse.blob()
      const audioBuffer = await audioBlob.arrayBuffer()
      const audioBase64 = Buffer.from(audioBuffer).toString('base64')
      return { audio: audioBase64, sentenceId }
    } catch (error) {
      console.error("Error generating speech for sentence:", error)
      throw error
    }
  }

  /**
   * Sends audio data to the client as it is ready
   * @param audioPromiseQueue - The queue of audio promises.
   */
  private async processAudioQueue(audioPromiseQueue: PromiseQueue<{ audio: string, sentenceId: string }>): Promise<void> {
    await audioPromiseQueue.process(
      (audioData) => {
        this.sendFrame(FrameBuilder.audio(audioData.audio, 24000, audioData.sentenceId))
      },
      (error, index) => {
        console.error(`Error processing audio at index ${index}:`, error)
      }
    )
  }


  /**
   * Generates suggested responses using a separate LLM call
   * @param assistantResponse - The assistant's response that was just generated
   * @param characterId - The character ID (used to determine character context)
   * @returns Array of suggested follow-up responses
   */
  private async generateSuggestedResponses(assistantResponse: string, characterId: CharacterId): Promise<string[]> {
    try {
      // Build the conversation context for the suggestions call
      const conversationContext = [
        ...this.messages,
        { role: "assistant" as const, content: assistantResponse }
      ]

      // Get the character's suggestions prompt
      const character = getCharacter(characterId)
      const suggestionsPrompt = character.suggestionsPrompt

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: suggestionsPrompt },
          ...conversationContext,
          { 
            role: "user" as const, 
            content: "Based on our conversation so far, suggest 3 natural follow-up questions I might ask. Return only the 3 questions, one per line, without numbers or formatting." 
          }
        ],
        temperature: 0.8,
        max_tokens: 150
      })

      const suggestionsText = response.choices[0]?.message?.content || ""
      const suggestions = suggestionsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 3) // Ensure we only take 3 suggestions

      return suggestions
    } catch (error) {
      console.error("Error generating suggested responses:", error)
      return []
    }
  }

  /**
   * Sends a frame to the client immediately.
   * @param frame - The frame to send.
   */
  private sendFrame(frame: StreamFrame) {
    if (this.controller.desiredSize === null) {
      console.warn("Attempted to send frame after stream closed")
      return
    }
    
    const frameData = JSON.stringify(frame)
    this.controller.enqueue(this.encoder.encode(`data: ${frameData}\n\n`))
  }
}
