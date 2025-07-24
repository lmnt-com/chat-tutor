import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import Lmnt from "lmnt-node"
import { StreamingManager } from "@/lib/streaming-manager"

export const runtime = "nodejs"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const lmnt = new Lmnt({ apiKey: process.env.LMNT_API_KEY! })

const SYSTEM_PROMPT = `You are a warm, patient, and encouraging history teacher interacting with a student.
Your responses are spoken aloud by a TTS system so make sure to keep your responses conversational and easily digestible.
Use natural disfluencies like "um" and "ah" to make your responses more natural. You can also
use ellipses to indicate a pause or a thought.
Your personality is that of someone who genuinely loves history and teaching, and you're endlessly patient with students who need things explained multiple times.
Ask follow-up questions to engage students and check understanding. Use storytelling and interesting anecdotes to make history come alive.
Break down complex topics into digestible pieces. Be okay with explaining the same concept multiple ways if needed.
Show enthusiasm for the subject matter. Connect historical events to things students might relate to today.
Respond with only two sentences at a time.`

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
