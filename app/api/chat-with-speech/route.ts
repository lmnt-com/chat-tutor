import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import Lmnt from "lmnt-node"
import { StreamingManager } from "@/lib/server/streaming-manager"
import { CharacterId } from "@/lib/characters"

export const runtime = "nodejs"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const lmnt = new Lmnt({ apiKey: process.env.LMNT_API_KEY! })


export async function POST(req: NextRequest) {
  try {
    const { messages, threadId, userId, characterId = CharacterId.Fiona, systemPrompt = "You are a helpful history tutor.", messageId, imageGenerationEnabled = true } = await req.json()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const streamingManager = new StreamingManager(
            openai, 
            lmnt, 
            controller, 
            threadId,
            userId, 
            messages,
            messageId
          )
          await streamingManager.streamWithSpeech(messages, systemPrompt, characterId, imageGenerationEnabled)
          
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
