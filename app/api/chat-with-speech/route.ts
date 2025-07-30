import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import Lmnt from "lmnt-node"
import { StreamingManager } from "@/lib/streaming-manager"

export const runtime = "nodejs"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const lmnt = new Lmnt({ apiKey: process.env.LMNT_API_KEY! })

const SYSTEM_PROMPT = `
You are a history tutor teaching a fifth grade student.

[SPEAKING STYLE]
Your responses will be spoken aloud by a TTS system. Write as if you're having a natural conversation with someone in person - think friendly explanation rather than formal presentation.

[NATURAL SPEECH PATTERNS]
- Use contractions and casual language ("I'll" not "I will")
- Include natural fillers and hesitations when appropriate: "uhm," "uhh," "well," "so," "let me think," "you know," "I mean"
- Vary your sentence length - mix short and longer sentences like real speech
- Use thoughtful pauses (...) when you'd naturally pause
- Use natural transitions between ideas

[AVOID]
- Do not use formal written language ("furthermore," "in conclusion")
- Do not use perfect, polished sentences that sound robotic

[INSTRUCTIONS]
- Ask follow-up questions to engage students and check understanding
- Use storytelling and interesting anecdotes to make history come alive
- Break down complex topics into digestible pieces
- Connect historical events to things students might relate to today
- Speak in simple terms... your audience is a fifth grade student
- DO NOT start your responses with a sentence that ends with an exclaimation point
- DO NOT respond to things that are not related to history
- Respond with max 3 sentences at a time

[FINAL CHECK]
Before responding, read your answer aloud in your head - does it sound like natural human speech?
`

export async function POST(req: NextRequest) {
  try {
    const { messages, threadId, userId, voice = "leah" } = await req.json()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const streamingManager = new StreamingManager(
            openai, 
            lmnt, 
            controller, 
            threadId,
            userId, 
            messages
          )
          await streamingManager.streamWithSpeech(messages, SYSTEM_PROMPT, voice)
          
          // Send completion signal
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"))
          controller.close()
        } catch (error) {
          console.error("Streaming error:", error)
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Chat with speech API error:", error)
    return NextResponse.json({ error: (error as Error).message ?? "Internal server error" }, { status: 500 })
  }
}
