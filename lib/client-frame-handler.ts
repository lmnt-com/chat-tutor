import { StreamFrame, TextFrame, AudioFrame, StatusFrame, SuggestedResponsesFrame, FrameHandler } from './types'

// Declare WebKit AudioContext interface
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

export class ClientFrameHandler implements FrameHandler {
  private audioContext: AudioContext | null = null
  private currentAudioSource: AudioBufferSourceNode | null = null
  private audioQueue: ArrayBuffer[] = []
  private isPlayingAudio = false
  private isAudioEnabled = true
  private onTextUpdate: (content: string) => void
  private onStatusUpdate: (status: string, message?: string) => void
  private onSuggestedResponsesUpdate?: (suggestions: string[]) => void

  constructor(
    onTextUpdate: (content: string) => void,
    onStatusUpdate: (status: string, message?: string) => void,
    onSuggestedResponsesUpdate?: (suggestions: string[]) => void
  ) {
    this.onTextUpdate = onTextUpdate
    this.onStatusUpdate = onStatusUpdate
    this.onSuggestedResponsesUpdate = onSuggestedResponsesUpdate
  }

  setAudioEnabled(enabled: boolean) {
    this.isAudioEnabled = enabled
  }

  onTextFrame(frame: TextFrame): void {
    this.onTextUpdate(frame.content)
  }

  onAudioFrame(frame: AudioFrame): void {
    if (!this.isAudioEnabled) return

    try {
      // Convert base64 to ArrayBuffer
      const audioBuffer = Uint8Array.from(atob(frame.data), (c) => c.charCodeAt(0)).buffer

      // Add to audio queue
      this.addToAudioQueue(audioBuffer)
    } catch (error) {
      console.error("Error processing audio frame:", error)
      // Don't throw error, just log it and continue
    }
  }


  onStatusFrame(frame: StatusFrame): void {
    this.onStatusUpdate(frame.status, frame.message)
  }

  onSuggestedResponsesFrame(frame: SuggestedResponsesFrame): void {
    if (this.onSuggestedResponsesUpdate) {
      this.onSuggestedResponsesUpdate(frame.suggestions)
    }
  }

  onError(error: Error): void {
    console.error("Frame handler error:", error)
    this.onStatusUpdate('error', error.message)
  }

  private async initializeAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()

      // Resume context if it's suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
    }
  }

  private async playAudioChunk(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      await this.initializeAudioContext()

      const audioData = await this.audioContext!.decodeAudioData(audioBuffer)

      const source = this.audioContext!.createBufferSource()
      source.buffer = audioData
      source.connect(this.audioContext!.destination)

      // Store reference to current audio source
      this.currentAudioSource = source

      // Set up completion handler to play next audio in queue
      source.onended = () => {
        this.isPlayingAudio = false
        this.currentAudioSource = null
        this.playNextInQueue()
      }

      source.start()
    } catch (error) {
      console.error("Audio playback error:", error)
      this.isPlayingAudio = false
      this.currentAudioSource = null
      this.playNextInQueue()
    }
  }

  private playNextInQueue(): void {
    if (this.audioQueue.length > 0 && !this.isPlayingAudio) {
      this.isPlayingAudio = true
      const nextAudio = this.audioQueue.shift()!
      this.playAudioChunk(nextAudio)
    }
  }

  private addToAudioQueue(audioBuffer: ArrayBuffer): void {
    this.audioQueue.push(audioBuffer)

    // Start playing if nothing is currently playing
    if (!this.isPlayingAudio) {
      this.playNextInQueue()
    }
  }

  // Parse and handle incoming frame data
  handleFrameData(data: string): void {
    try {
      if (!data.trim()) return

      const frame: StreamFrame = JSON.parse(data)

      switch (frame.type) {
        case 'text':
          this.onTextFrame(frame as TextFrame)
          break
        case 'audio':
          this.onAudioFrame(frame as AudioFrame)
          break
        case 'status':
          this.onStatusFrame(frame as StatusFrame)
          break
        case 'suggested_responses':
          this.onSuggestedResponsesFrame(frame as SuggestedResponsesFrame)
          break
        default:
          const exhaustiveCheck: never = frame
          return exhaustiveCheck
      }
    } catch (error) {
      console.error("Error parsing frame data:", error, "Data:", data.substring(0, 100) + "...")
      // Don't call onError for JSON parsing errors, just log them
      // This prevents cascading errors from split base64 data
    }
  }


  // Stop audio playback and clear queue
  stopAudio(): void {
    this.audioQueue = []
    this.isPlayingAudio = false
    if (this.currentAudioSource) {
      this.currentAudioSource.stop()
      this.currentAudioSource.disconnect()
      this.currentAudioSource = null
    }
  }
}
