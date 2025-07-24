export class SentenceBuffer {
  private buffer: string = ""
  private onSentenceComplete: (sentence: string) => void

  constructor(onSentenceComplete: (sentence: string) => void) {
    this.onSentenceComplete = onSentenceComplete
  }

  addText(text: string): void {
    this.buffer += text
    this.processBuffer()
  }

  flush(): void {
    if (this.buffer.trim()) {
      this.onSentenceComplete(this.buffer.trim())
      this.buffer = ""
    }
  }

  private processBuffer(): void {
    // Look for sentence endings
    const sentenceEnders = /[.!?]+/g
    let match

    while ((match = sentenceEnders.exec(this.buffer)) !== null) {
      const endIndex = match.index + match[0].length
      
      // Check if there's a space or end of string after the punctuation
      if (endIndex >= this.buffer.length || this.buffer[endIndex] === ' ') {
        const sentence = this.buffer.substring(0, endIndex).trim()
        if (sentence) {
          this.onSentenceComplete(sentence)
        }
        this.buffer = this.buffer.substring(endIndex).trimStart()
        sentenceEnders.lastIndex = 0 // Reset regex
        break
      }
    }
  }
}