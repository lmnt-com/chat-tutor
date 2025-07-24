import { StreamFrame, TextFrame, AudioFrame, StatusFrame, DurationFrame, FrameHandler } from './types'

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
  private onDurationUpdate: (durations: Array<{text?: string, start?: number, duration?: number}>) => void
  private onAudioStateUpdate: (isPlaying: boolean, startTime: number) => void

  // Duration tracking
  private allDurations: Array<{text?: string, start?: number, duration?: number}> = []
  private audioStartTime = 0
  private totalDurationOffset = 0 // Track accumulated time for duration frames, since they reset each frame

  constructor(
    onTextUpdate: (content: string) => void,
    onStatusUpdate: (status: string, message?: string) => void,
    onDurationUpdate?: (durations: Array<{text?: string, start?: number, duration?: number}>) => void,
    onAudioStateUpdate?: (isPlaying: boolean, startTime: number) => void
  ) {
    this.onTextUpdate = onTextUpdate
    this.onStatusUpdate = onStatusUpdate
    this.onDurationUpdate = onDurationUpdate || (() => {})
    this.onAudioStateUpdate = onAudioStateUpdate || (() => {})
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

  onDurationFrame(frame: DurationFrame): void {
    // Adjust start times by adding the accumulated offset
    const adjustedDurations = frame.durations.map(duration => ({
      ...duration,
      start: duration.start !== undefined ? duration.start + this.totalDurationOffset : undefined
    }))

    // Add a space entry at the end of this frame if it has content
    if (frame.durations.length > 0) {
      const lastDuration = frame.durations[frame.durations.length - 1]
      if (lastDuration.start !== undefined && lastDuration.duration !== undefined) {
        adjustedDurations.push({
          text: ' ',
          start: lastDuration.start + lastDuration.duration + this.totalDurationOffset,
          duration: 0
        })
      }
    }

    // Accumulate all duration data with adjusted timing
    this.allDurations.push(...adjustedDurations)

    // Update the total offset for the next frame
    this.totalDurationOffset += frame.durations[frame.durations.length - 1].duration! + frame.durations[frame.durations.length - 1].start!

    // Notify parent component of updated durations
    this.onDurationUpdate(this.allDurations)
  }

  onStatusFrame(frame: StatusFrame): void {
    this.onStatusUpdate(frame.status, frame.message)
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
        this.onAudioStateUpdate(false, 0)
        this.playNextInQueue()
      }

      source.start()
      this.audioStartTime = this.audioContext!.currentTime
      this.onAudioStateUpdate(true, this.audioStartTime)
    } catch (error) {
      console.error("Audio playback error:", error)
      this.isPlayingAudio = false
      this.currentAudioSource = null
      this.onAudioStateUpdate(false, 0)
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
        case 'duration':
          this.onDurationFrame(frame as DurationFrame)
          break
        case 'status':
          this.onStatusFrame(frame as StatusFrame)
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

  // Get current durations for highlighting
  getDurations(): Array<{text?: string, start?: number, duration?: number}> {
    return this.allDurations
  }

  private resetDurations(): void {
    this.totalDurationOffset = 0
    this.allDurations = []
  }

  // Stop audio playback and clear queue
  stopAudio(): void {
    this.audioQueue = []
    this.isPlayingAudio = false
    this.onAudioStateUpdate(false, 0)
    this.resetDurations()
    this.onDurationUpdate([])
    if (this.currentAudioSource) {
      this.currentAudioSource.stop()
      this.currentAudioSource.disconnect()
      this.currentAudioSource = null
    }
  }
}
