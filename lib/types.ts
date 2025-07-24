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
}


export interface StatusFrame extends BaseFrame {
  type: 'status'
  status: 'started' | 'processing' | 'completed' | 'error'
  message?: string
}

export type StreamFrame = TextFrame | AudioFrame | StatusFrame

// Server-side frame builders
export class FrameBuilder {
  static text(content: string): TextFrame {
    return {
      type: 'text',
      content,
      timestamp: Date.now()
    }
  }

  static audio(data: string, sampleRate: number = 24000): AudioFrame {
    return {
      type: 'audio',
      data,
      format: 'mp3',
      sampleRate,
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
}

// Client-side frame handlers
export interface FrameHandler {
  onTextFrame(frame: TextFrame): void
  onAudioFrame(frame: AudioFrame): void
  onStatusFrame(frame: StatusFrame): void
  onError(error: Error): void
}
