import { NextRequest, NextResponse } from "next/server"
import { Thread } from "@/lib/thread"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params

    if (!threadId) {
      return NextResponse.json({ error: "Thread ID is required" }, { status: 400 })
    }

    const thread = new Thread(threadId)
    const success = await thread.delete(threadId)

    if (success) {
      return NextResponse.json({ success: true, message: "Chat thread deleted successfully" })
    } else {
      return NextResponse.json({ error: "Failed to delete chat thread" }, { status: 500 })
    }
  } catch (error) {
    console.error("Delete chat thread API error:", error)
    return NextResponse.json(
      { error: (error as Error).message ?? "Internal server error" },
      { status: 500 }
    )
  }
}
