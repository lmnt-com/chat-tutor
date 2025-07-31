import Lmnt from 'lmnt-node'
import OpenAI from 'openai'
import { Stream } from 'openai/core/streaming.mjs'
import { FrameBuilder, Message, StreamFrame } from '../types'
import { Thread } from './thread'
import { SentenceBuffer } from '../sentence-buffer'
import { PromiseQueue } from '../promise-queue'

const SUGGESTIONS_MARKER = "[SUGG]"

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
    let textBuffer = ""
    let hitSuggestionsMarker = false
    
    const sentenceBuffer = new SentenceBuffer((sentence) => {
      audioPromiseQueue.add(this.generateSpeechForSentence(sentence, voice))
    })

    for await (const chunk of openaiStream) {
      const content = chunk.choices[0]?.delta?.content || ""
      if (content) {
        fullResponse += content
        
        if (!hitSuggestionsMarker) {
          textBuffer += content
          
          // Check if the buffer contains the suggestions marker
          if (textBuffer.includes(SUGGESTIONS_MARKER)) {
            hitSuggestionsMarker = true
            const parts = textBuffer.split(SUGGESTIONS_MARKER)
            const textBeforeMarker = parts[0]
            if (textBeforeMarker) {
              sentenceBuffer.addText(textBeforeMarker)
              this.sendFrame(FrameBuilder.text(textBeforeMarker))
            }
            // Will stop sending text frames after this point
          } else {
            // Buffer enough chars to catch split markers
            const maxBufferLength = SUGGESTIONS_MARKER.length
            if (textBuffer.length > maxBufferLength) {
              const textToSend = textBuffer.slice(0, -maxBufferLength)
              sentenceBuffer.addText(textToSend)
              this.sendFrame(FrameBuilder.text(textToSend))
              textBuffer = textBuffer.slice(-maxBufferLength)
            }
          }
        }
      }
    }

    // Send any remaining text in the buffer (the llm may have ended the response without a suggestions marker)
    if (!hitSuggestionsMarker && textBuffer.length > 0) {
      sentenceBuffer.addText(textBuffer)
      this.sendFrame(FrameBuilder.text(textBuffer))
    }

    // Process any remaining text in the sentence buffer
    sentenceBuffer.flush()

    // Signal that no more audio promises will be added
    audioPromiseQueue.markComplete()

    // Extract suggestions and clean response from the full response
    const { cleanedResponse, suggestedResponses } = this.extractSuggestedResponses(fullResponse)
    
    // Send suggested responses if any were found
    if (suggestedResponses.length > 0) {
      this.sendFrame(FrameBuilder.suggestedResponses(suggestedResponses))
    }

    // Save the clean response (without suggestions) to the database
    await this.thread.save(
      this.userId,
      this.messages,
      cleanedResponse
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
   * Extracts suggested responses from the LLM output and returns cleaned response
   * @param fullResponse - The complete response from the LLM
   * @returns Object containing cleaned response and extracted suggestions
   */
  private extractSuggestedResponses(fullResponse: string): { cleanedResponse: string, suggestedResponses: string[] } {
    const suggestionsRegex = /\[SUGG\]([\s\S]*?)\[\/SUGG\]/
    const match = fullResponse.match(suggestionsRegex)
    
    if (!match) {
      return { cleanedResponse: fullResponse, suggestedResponses: [] }
    }
    
    const suggestionsText = match[1].trim()
    const suggestions = suggestionsText
      .split('\n')
      .filter(line => line.trim().match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(suggestion => suggestion.length > 0)
    
    // Remove the suggestions section from the response
    const cleanedResponse = fullResponse.replace(suggestionsRegex, '').trim()
    
    return { cleanedResponse, suggestedResponses: suggestions }
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
