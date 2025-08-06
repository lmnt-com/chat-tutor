import { createServerClient, isSupabaseAvailable } from "../supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { Message } from "../types";

const THREAD_TITLE_MAX_LENGTH = 50;

export class Thread {
  private supabase: SupabaseClient | null;
  private threadId: string | null;

  constructor(threadId: string | null) {
    this.supabase = createServerClient();
    this.threadId = threadId;
  }

  async save(
    userId: string | null,
    messages: Message[],
    assistantResponse: string,
  ) {
    if (!isSupabaseAvailable() || !this.supabase) return;

    if (!userId || messages.length === 0) return;

    try {
      if (this.threadId) {
        await this.updateExisting(this.threadId, messages, assistantResponse);
      } else {
        const title =
          assistantResponse.slice(0, THREAD_TITLE_MAX_LENGTH) || "New Chat";
        await this.createNew(userId, title, messages, assistantResponse);
      }
    } catch (error) {
      console.error("Database operation error:", error);
    }
  }

  async delete(threadId: string): Promise<boolean> {
    if (!isSupabaseAvailable() || !this.supabase) return true;

    try {
      // Delete the chat thread (this will cascade delete messages due to foreign key constraint)
      const { error } = await this.supabase
        .from("chat_threads")
        .delete()
        .eq("id", threadId);

      if (error) {
        console.error("Error deleting chat thread:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Database operation error:", error);
      return false;
    }
  }

  private async updateExisting(
    threadId: string,
    messages: Message[],
    assistantResponse: string,
  ) {
    if (!this.supabase) return;

    const { error: updateError } = await this.supabase
      .from("chat_threads")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    if (updateError) {
      console.error("Error updating chat thread:", updateError);
      return;
    }

    // Get the most recent user message and the assistant's response
    const latestMessages = [
      messages[messages.length - 1], // Most recent user message
      { role: "assistant", content: assistantResponse },
    ];

    // Save both the user's message and the assistant's response to the existing thread
    const { error: messagesError } = await this.supabase
      .from("chat_messages")
      .insert(
        latestMessages.map((msg: { role: string; content: string }) => ({
          thread_id: threadId,
          role: msg.role,
          content: msg.content,
          created_at: new Date().toISOString(),
        })),
      );

    if (messagesError) {
      console.error("Error saving messages to existing thread:", messagesError);
    }
  }

  private async createNew(
    userId: string,
    title: string,
    messages: Message[],
    assistantResponse: string,
  ) {
    if (!this.supabase) return;

    const { data, error: insertError } = await this.supabase
      .from("chat_threads")
      .insert({
        user_id: userId,
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating chat thread:", insertError);
      return;
    }

    this.threadId = data.id;

    // Save all messages including the assistant's response to the thread
    const allMessages = [
      ...messages,
      { role: "assistant", content: assistantResponse },
    ];

    const { error: messagesError } = await this.supabase
      .from("chat_messages")
      .insert(
        allMessages.map((msg: { role: string; content: string }) => ({
          thread_id: data.id,
          role: msg.role,
          content: msg.content,
          created_at: new Date().toISOString(),
        })),
      );

    if (messagesError) {
      console.error("Error saving messages:", messagesError);
    }
  }
}
