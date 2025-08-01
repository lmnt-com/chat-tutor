// Frame types for streaming communication between API and frontend

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export interface ChatThread {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface BaseFrame {
  type: string
  timestamp: number
}

export interface TextFrame extends BaseFrame {
  type: 'text'
  content: string
}

export interface AudioFrame extends BaseFrame {
  type: 'audio'
  data: string // base64 encoded audio
  format: 'mp3'
  sampleRate: number
  duration?: number
  sentenceId?: string // correlate audio with sentence
}


export interface StatusFrame extends BaseFrame {
  type: 'status'
  status: 'started' | 'processing' | 'completed' | 'error'
  message?: string
}

export interface SuggestedResponsesFrame extends BaseFrame {
  type: 'suggested_responses'
  suggestions: string[] // Array of 3 suggested responses
}

export interface SentenceBoundaryFrame extends BaseFrame {
  type: 'sentence_boundary'
  sentenceId: string
  startPosition: number
  endPosition: number
}

export type StreamFrame = TextFrame | AudioFrame | StatusFrame | SuggestedResponsesFrame | SentenceBoundaryFrame

// Server-side frame builders
export class FrameBuilder {
  static text(content: string): TextFrame {
    return {
      type: 'text',
      content,
      timestamp: Date.now()
    }
  }

  static audio(data: string, sampleRate: number = 24000, sentenceId?: string): AudioFrame {
    return {
      type: 'audio',
      data,
      format: 'mp3',
      sampleRate,
      sentenceId,
      timestamp: Date.now()
    }
  }


  static status(status: StatusFrame['status'], message?: string): StatusFrame {
    return {
      type: 'status',
      status,
      message,
      timestamp: Date.now()
    }
  }

  static suggestedResponses(suggestions: string[]): SuggestedResponsesFrame {
    return {
      type: 'suggested_responses',
      suggestions,
      timestamp: Date.now()
    }
  }

  static sentenceBoundary(sentenceId: string, startPosition: number, endPosition: number): SentenceBoundaryFrame {
    return {
      type: 'sentence_boundary',
      sentenceId,
      startPosition,
      endPosition,
      timestamp: Date.now()
    }
  }
}

export interface SentenceSpan {
  id: string
  start: number
  end: number
}

export interface MessageHighlighting {
  messageId: string
  sentences: SentenceSpan[]
  activeSentenceId: string | null
}

// Client-side frame handlers
export interface FrameHandler {
  onTextFrame(frame: TextFrame): void
  onAudioFrame(frame: AudioFrame): void
  onStatusFrame(frame: StatusFrame): void
  onSuggestedResponsesFrame(frame: SuggestedResponsesFrame): void
  onSentenceBoundaryFrame(frame: SentenceBoundaryFrame): void
  onError(error: Error): void
}
