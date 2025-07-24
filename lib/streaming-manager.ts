import Lmnt from 'lmnt-node'
import OpenAI from 'openai'
import { Stream } from 'openai/core/streaming.mjs'
import { FrameBuilder, Message, StreamFrame } from './types'
import { Thread } from './thread'

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

  private async processAudioChunk(audioBuffer: ArrayBuffer) {
    // Convert audio buffer to base64
    const audioBase64 = Buffer.from(new Uint8Array(audioBuffer)).toString('base64')

    // Send audio frame to client
    this.sendFrame(FrameBuilder.audio(audioBase64))
  }

  private async processAudioStream(speechConnection: Lmnt.Sessions.SpeechSession) {
    for await (const message of speechConnection) {
      if (message.audio) {
        await this.processAudioChunk(message.audio as ArrayBuffer)
      }
      if (message.durations && message.durations.length > 0) {
        this.sendFrame(FrameBuilder.duration(message.durations))
      }
    }
  }

  private async processTextChunk(content: string, speechConnection: Lmnt.Sessions.SpeechSession) {
    if (!content) return

    // Send text to LMNT for speech synthesis
    speechConnection.appendText(content)

    // Send text frame to client
    this.sendFrame(FrameBuilder.text(content))
  }

  private async processTextStream(openaiStream: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>, speechConnection: Lmnt.Sessions.SpeechSession) {
    let fullResponse = ""

    for await (const chunk of openaiStream) {
      const content = chunk.choices[0]?.delta?.content || ""
      if (content) {
        fullResponse += content
        await this.processTextChunk(content, speechConnection)
      }
    }

    // Save the chat thread after the complete response is generated
    await this.thread.save(
      this.userId,
      this.messages,
      fullResponse
    )

    // Finish LMNT to get final audio chunks
    speechConnection.finish()
  }

  private sendFrame(frame: StreamFrame) {
    const frameData = JSON.stringify(frame)
    this.controller.enqueue(this.encoder.encode(`data: ${frameData}\n\n`))
  }

  async streamWithSpeech(
    messages: Message[],
    systemPrompt: string,
    voice: string
  ) {
    try {
      // Send start status
      this.sendFrame(FrameBuilder.status('started', 'Initializing speech session'))

      // Create LMNT speech session
      const speechConnection = this.lmnt.speech.sessions.create({
        voice,
        format: "mp3",
        sample_rate: 24000,
        return_extras: true,
      })

      // Create OpenAI streaming connection
      const openaiStream = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        temperature: 0.7,
      })

      // Send processing status
      this.sendFrame(FrameBuilder.status('processing', 'Generating response'))

      // Process text and audio streams concurrently
      await Promise.all([
        this.processTextStream(openaiStream, speechConnection),
        this.processAudioStream(speechConnection)
      ])

      // Send completion status
      this.sendFrame(FrameBuilder.status('completed', 'Response complete'))

      // Close connections
      speechConnection.close()

    } catch (error) {
      console.error("Streaming error:", error)
      this.sendFrame(FrameBuilder.status('error', (error as Error).message))
      throw error
    }
  }
}
