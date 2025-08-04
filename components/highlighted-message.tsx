"use client"

import React from "react"
import { cn } from "@/lib/utils"
import type { SentenceSpan } from "@/lib/types"

interface HighlightedMessageProps {
  content: string
  currentlyPlayingSentenceId: string | null
  sentences: SentenceSpan[]
  isCurrentMessage: boolean
  className?: string
}

export function HighlightedMessage({ 
  content, 
  currentlyPlayingSentenceId, 
  sentences,
  isCurrentMessage,
  className = "",
}: HighlightedMessageProps) {
  const textSize = "text-base leading-relaxed"
  
  // If no sentences or content or not the current message, render plain text
  if (sentences.length === 0 || !content || !isCurrentMessage) {
    return <p className={cn(textSize, className)}>{content}</p>
  }

  // Sentences are already sorted by start position from SentenceTracker
  const sentencesArray = sentences

  const renderParts = () => {
    const parts: React.ReactNode[] = []
    let lastPosition = 0

    sentencesArray.forEach((sentence, index) => {
      // Ensure positions are within content bounds
      const startPos = Math.max(0, Math.min(sentence.start, content.length))
      const endPos = Math.max(startPos, Math.min(sentence.end, content.length))
      
      // Add any text before this sentence
      if (startPos > lastPosition) {
        const beforeText = content.slice(lastPosition, startPos)
        if (beforeText) {
          parts.push(
            <span key={`before-${index}`}>
              {beforeText}
            </span>
          )
        }
      }

      const actualSentenceText = content.slice(startPos, endPos)
      if (actualSentenceText) {
        const isHighlighted = currentlyPlayingSentenceId === sentence.id
        parts.push(
          <span
            key={sentence.id}
            className={cn(
              "transition-all duration-100",
              isHighlighted && "border-b-2 border-yellow-400 bg-yellow-100 dark:bg-yellow-800/30"
            )}
          >
            {actualSentenceText}
          </span>
        )
      }

      lastPosition = endPos
    })

    // Add any remaining text after the last sentence
    if (lastPosition < content.length) {
      const remainingText = content.slice(lastPosition)
      if (remainingText) {
        parts.push(
          <span key="remaining">
            {remainingText}
          </span>
        )
      }
    }

    return parts
  }

  return (
    <p className={cn(textSize, className)}>
      {renderParts()}
    </p>
  )
}
