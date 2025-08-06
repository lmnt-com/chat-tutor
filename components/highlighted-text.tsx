"use client";

import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface Duration {
  text?: string;
  start?: number;
  duration?: number;
}

interface HighlightedTextProps {
  text: string;
  durations: Duration[];
  audioStartTime: number;
  isPlaying: boolean;
  className?: string;
}

export function HighlightedText({
  text,
  durations,
  audioStartTime,
  isPlaying,
  className = "",
}: HighlightedTextProps) {
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying || durations.length === 0) {
      setHighlightedIndex(-1);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start timing from when audio begins playing
    startTimeRef.current = Date.now() - audioStartTime * 1000;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up interval to check timing every 50ms for smooth highlighting
    intervalRef.current = setInterval(() => {
      const currentTime = (Date.now() - startTimeRef.current) / 1000;

      // Find which word should be highlighted based on timing
      let newIndex = -1;
      for (let i = 0; i < durations.length; i++) {
        const duration = durations[i];
        if (duration.start !== undefined && duration.duration !== undefined) {
          if (
            currentTime >= duration.start &&
            currentTime < duration.start + duration.duration
          ) {
            newIndex = i;
            break;
          }
        }
      }

      setHighlightedIndex(newIndex);
    }, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, durations, audioStartTime]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (durations.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Create highlighted text by mapping through durations
  const elements: React.ReactNode[] = [];

  let chars_covered_so_far = 0;
  durations.forEach((duration, index) => {
    if (duration.text !== undefined) {
      const isHighlighted = index === highlightedIndex;
      elements.push(
        <span
          key={index}
          className={cn(
            "transition-all duration-100",
            isHighlighted && "bg-yellow-100 border-b-2 border-yellow-400",
          )}
        >
          {duration.text}
        </span>,
      );
      chars_covered_so_far += duration.text.length;
    }
  });

  // add any remaining text that wasn't covered by durations - we'll eventually get a duration frame for this
  if (chars_covered_so_far < text.length) {
    elements.push(
      <span key="remaining" className={className}>
        {text.slice(chars_covered_so_far)}
      </span>,
    );
  }

  return <span className={className}>{elements}</span>;
}
