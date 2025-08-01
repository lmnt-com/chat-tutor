export class SentenceBuffer {
  private buffer = ""
  private totalCharacters = 0
  private sentenceCount = 0
  private processingThreshold = 50
  
  constructor(
    private onSentenceBoundary?: (id: string, start: number, end: number, sentence: string) => void
  ) {}

  addText(text: string): void {
    this.buffer += text
    this.totalCharacters += text.length
    
    // Only process when we have enough content or if we detect sentence endings
    if (this.buffer.length >= this.processingThreshold || this.hasPotentialSentenceEnding(text)) {
      this.processBuffer()
    }
  }

  flush(): void {
    if (this.buffer.trim()) {
      const sentenceId = this.generateSentenceId()
      const startPos = this.totalCharacters - this.buffer.length
      const endPos = this.totalCharacters

      this.onSentenceBoundary?.(sentenceId, startPos, endPos, this.buffer)
      
      this.buffer = ""
    }
  }

  private hasPotentialSentenceEnding(text: string): boolean {
    // Quick check for sentence endings without regex
    return /[.!?]/.test(text)
  }

  private processBuffer(): void {
    const sentencePattern = /([.!?]+)\s+/g
    let lastIndex = 0
    let match

    while ((match = sentencePattern.exec(this.buffer)) !== null) {
      const punctuationEnd = match.index + match[1].length
      const fullMatchEnd = match.index + match[0].length
      
      const sentenceText = this.buffer.substring(lastIndex, punctuationEnd).trim()
      
      if (sentenceText) {
        const sentenceId = this.generateSentenceId()
        const startPos = this.totalCharacters - this.buffer.length + lastIndex
        const endPos = this.totalCharacters - this.buffer.length + punctuationEnd

        this.onSentenceBoundary?.(sentenceId, startPos, endPos, sentenceText)
      }
      
      lastIndex = fullMatchEnd
    }
    
    // Remove processed sentences from buffer
    if (lastIndex > 0) {
      this.buffer = this.buffer.substring(lastIndex)
    }
  }

  private generateSentenceId(): string {
    return `s${++this.sentenceCount}`
  }
}