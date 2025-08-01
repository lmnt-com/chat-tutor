import { StreamFrame, TextFrame, AudioFrame, StatusFrame, SuggestedResponsesFrame, SentenceBoundaryFrame, ImageFrame, FrameHandler, SentenceSpan } from './types'

// Declare WebKit AudioContext interface
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

// Message-aware sentence tracking with event emission
class MessageSentenceManager {
  // Map of message IDs to their sentence spans (highlight cues)
  private sentenceHighlights = new Map<string, SentenceSpan[]>()
  private currentMessageId: string | null = null
  private activeSentenceId: string | null = null
  private onSentencesChanged?: (messageId: string, sentenceSpans: SentenceSpan[]) => void
  private onActiveChanged?: (messageId: string | null, sentenceId: string | null) => void
  
  setCurrentMessage(messageId: string): void {
    this.currentMessageId = messageId
  }
  
  /**
  * Updates the message-sentence manager with a new sentence for the current
  * message, triggering a change event with the updated sentence highlights.
  * @param id - The sentence ID
  * @param start - The start position of the sentence
  * @param end - The end position of the sentence
  */
  addSentence(id: string, start: number, end: number): void {
    if (!this.currentMessageId) return
    
    const sentences = this.sentenceHighlights.get(this.currentMessageId) || []
    const newSentence: SentenceSpan = { id, start, end }
    
    // Add sentence (expect that sentence spans come in sequential order)
    const updatedSentences = [...sentences, newSentence]
    this.sentenceHighlights.set(this.currentMessageId, updatedSentences)

    this.onSentencesChanged?.(this.currentMessageId, updatedSentences)
  }
  
  /**
  * Sets the active sentence for the current message, triggering
  * a change event with the active sentence
  * @param sentenceId - The sentence ID
  */
  setActiveSentence(sentenceId: string | null): void {
    this.activeSentenceId = sentenceId
    this.onActiveChanged?.(this.currentMessageId, sentenceId)
  }
  
  getSentencesForMessage(messageId: string): SentenceSpan[] {
    return this.sentenceHighlights.get(messageId) || []
  }
  
  getActiveSentence(): { messageId: string | null; sentenceId: string | null } {
    return { messageId: this.currentMessageId, sentenceId: this.activeSentenceId }
  }
  
  getCurrentMessageId(): string | null {
    return this.currentMessageId
  }
  
  setCallbacks(
    onSentencesChanged: (messageId: string, sentenceSpans: SentenceSpan[]) => void,
    onActiveChanged: (messageId: string | null, sentenceId: string | null) => void
  ): void {
    this.onSentencesChanged = onSentencesChanged
    this.onActiveChanged = onActiveChanged
  }
}

interface AudioQueueItem {
  audioBuffer: ArrayBuffer
  sentenceId?: string
}

export class ClientFrameHandler implements FrameHandler {
  private audioContext: AudioContext | null = null
  private currentAudioSource: AudioBufferSourceNode | null = null
  private audioQueue: AudioQueueItem[] = []
  private isPlayingAudio = false
  private isAudioEnabled = true
  private sentenceManager = new MessageSentenceManager()
  private onTextUpdate: (content: string) => void
  private onStatusUpdate: (status: string, message?: string) => void
  private onSuggestedResponsesUpdate?: (suggestions: string[]) => void
  private onImageUpdate?: (imageData: string, description: string, messageId: string) => void

  constructor(
    onTextUpdate: (content: string) => void,
    onStatusUpdate: (status: string, message?: string) => void,
    onSuggestedResponsesUpdate?: (suggestions: string[]) => void,
    onSentencesChanged?: (messageId: string, sentenceSpans: SentenceSpan[]) => void,
    onActiveChanged?: (messageId: string | null, sentenceId: string | null) => void,
    onImageUpdate?: (imageData: string, description: string, messageId: string) => void
  ) {
    this.onTextUpdate = onTextUpdate
    this.onStatusUpdate = onStatusUpdate
    this.onSuggestedResponsesUpdate = onSuggestedResponsesUpdate
    this.onImageUpdate = onImageUpdate
    
    if (onSentencesChanged && onActiveChanged) {
      this.sentenceManager.setCallbacks(onSentencesChanged, onActiveChanged)
    }
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

      // Add to audio queue with sentence ID
      this.addToAudioQueue(audioBuffer, frame.sentenceId)
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

  onSentenceBoundaryFrame(frame: SentenceBoundaryFrame): void {
    this.sentenceManager.addSentence(frame.sentenceId, frame.startPosition, frame.endPosition)
  }

  onImageFrame(frame: ImageFrame): void {
    if (this.onImageUpdate) {
      this.onImageUpdate(frame.imageData, frame.description, frame.messageId)
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

  private async playAudioChunk(audioBuffer: ArrayBuffer, sentenceId?: string): Promise<void> {
    try {
      await this.initializeAudioContext()

      const audioData = await this.audioContext!.decodeAudioData(audioBuffer)

      const source = this.audioContext!.createBufferSource()
      source.buffer = audioData
      source.connect(this.audioContext!.destination)

      // Store reference to current audio source
      this.currentAudioSource = source

      // Update currently playing sentence and trigger highlight
      this.sentenceManager.setActiveSentence(sentenceId || null)

      // Set up completion handler to play next audio in queue
      source.onended = () => {
        this.isPlayingAudio = false
        this.currentAudioSource = null
        
        // Clear sentence highlight when audio ends
        this.sentenceManager.setActiveSentence(null)
        
        this.playNextInQueue()
      }

      source.start()
    } catch (error) {
      console.error("Audio playback error:", error)
      this.isPlayingAudio = false
      this.currentAudioSource = null
      this.sentenceManager.setActiveSentence(null)
      this.playNextInQueue()
    }
  }

  private playNextInQueue(): void {
    if (this.audioQueue.length > 0 && !this.isPlayingAudio) {
      this.isPlayingAudio = true
      const nextAudioItem = this.audioQueue.shift()!
      this.playAudioChunk(nextAudioItem.audioBuffer, nextAudioItem.sentenceId)
    }
  }

  private addToAudioQueue(audioBuffer: ArrayBuffer, sentenceId?: string): void {
    this.audioQueue.push({ audioBuffer, sentenceId })

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
        case 'sentence_boundary':
          this.onSentenceBoundaryFrame(frame as SentenceBoundaryFrame)
          break
        case 'image':
          this.onImageFrame(frame as ImageFrame)
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
    this.sentenceManager.setActiveSentence(null)
    if (this.currentAudioSource) {
      this.currentAudioSource.stop()
      this.currentAudioSource.disconnect()
      this.currentAudioSource = null
    }
  }

  // Start processing a new message
  startMessage(messageId: string): void {
    this.sentenceManager.setCurrentMessage(messageId)
  }

  // Get current message ID being processed
  getCurrentMessageId(): string | null {
    return this.sentenceManager.getCurrentMessageId()
  }
}
