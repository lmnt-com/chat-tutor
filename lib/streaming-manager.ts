import Lmnt from 'lmnt-node'
import OpenAI from 'openai'
import { Stream } from 'openai/core/streaming.mjs'
import { FrameBuilder, Message, StreamFrame } from './types'
import { Thread } from './thread'
import { SentenceBuffer } from './sentence-buffer'
import { PromiseQueue } from './promise-queue'

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
    voice: string
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

      const audioPromiseQueue = new PromiseQueue<string>()

      // Process text stream and audio concurrently
      await Promise.all([
        this.processTextStream(openaiStream, voice, audioPromiseQueue),
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
    voice: string,
    audioPromiseQueue: PromiseQueue<string>
  ) {
    let fullResponse = ""
    
    const sentenceBuffer = new SentenceBuffer((sentence) => {
      audioPromiseQueue.add(this.generateSpeechForSentence(sentence, voice))
    })

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

    await this.thread.save(
      this.userId,
      this.messages,
      fullResponse
    )
  }

  /**
   * Generates speech for a sentence and returns the audio data as a base64 string
   * @param sentence - The sentence to generate speech for.
   * @param voice - The voice to use for the speech.
   * @returns A promise that resolves to the audio data as a base64 string.
   */
  private async generateSpeechForSentence(sentence: string, voice: string): Promise<string> {
    try {
      const speechResponse = await this.lmnt.speech.generate({
        text: sentence,
        voice,
        language: 'en',
      })
      const audioBlob = await speechResponse.blob()
      const audioBuffer = await audioBlob.arrayBuffer()
      return Buffer.from(audioBuffer).toString('base64')
    } catch (error) {
      console.error("Error generating speech for sentence:", error)
      throw error
    }
  }

  /**
   * Sends audio data to the client as it is ready
   * @param audioPromiseQueue - The queue of audio promises.
   */
  private async processAudioQueue(audioPromiseQueue: PromiseQueue<string>): Promise<void> {
    await audioPromiseQueue.process(
      (audioData) => {
        this.sendFrame(FrameBuilder.audio(audioData))
      },
      (error, index) => {
        console.error(`Error processing audio at index ${index}:`, error)
      }
    )
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
