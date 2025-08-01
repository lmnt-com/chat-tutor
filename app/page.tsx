"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Volume2, VolumeX, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient, isSupabaseAvailable } from "@/lib/supabase"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ClientFrameHandler } from "@/lib/client-frame-handler"
import { Message, ChatThread } from "@/lib/types"
import { CharacterSelectionModal } from "@/components/character-selection-modal"
import { SettingsDialog } from "@/components/settings-dialog"
import { CharacterId, getCharacter } from "@/lib/characters"
import { SuggestedResponseBox } from "@/components/suggested-response-box"
import { HighlightedMessage } from "@/components/highlighted-message"
import type { SentenceSpan } from "@/lib/types"

export default function HistoryTutor() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([])
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [isUserLoading, setIsUserLoading] = useState(true)
  const [characterId, setCharacterId] = useState<CharacterId | null>(null)
  const [showCharacterSelection, setShowCharacterSelection] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([])
  const [activeHighlight, setActiveHighlight] = useState<{ messageId: string | null; sentenceId: string | null } | null>(null)
  const [currentMessageSentenceHighlights, setCurrentMessageSentenceHighlights] = useState<SentenceSpan[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const frameHandlerRef = useRef<ClientFrameHandler | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const savedCharacter = localStorage.getItem('historyTutorCharacter')
    if (savedCharacter && Object.values(CharacterId).includes(savedCharacter as CharacterId)) {
      setCharacterId(savedCharacter as CharacterId)
    } else {
      setShowCharacterSelection(true)
    }
  }, [])

  useEffect(() => {
    const loadChatThreads = async () => {
      if (!isSupabaseAvailable() || !supabase) return

      try {
        const { data, error } = await supabase.from("chat_threads").select("*").order("updated_at", { ascending: false })

        if (error) {
          console.error("Error loading chat threads:", error)
        } else if (data) {
          setChatThreads(data)
        }
      } catch (error) {
        console.error("Error in loadChatThreads:", error)
      }
    }

    const checkUser = async () => {
      setIsUserLoading(true)
      try {
        if (!isSupabaseAvailable() || !supabase) return

        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
        if (user) {
          loadChatThreads()
        }
      } catch (error) {
        console.error("Error checking user:", error)
        setUser(null)
      } finally {
        setIsUserLoading(false)
      }
    }

    checkUser()
  }, [hasStarted, supabase, characterId])

  const startConversation = useCallback(() => {
    if (!characterId) return
    const characterObj = getCharacter(characterId)
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: characterObj.firstMessage,
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
    setActiveHighlight({ messageId: null, sentenceId: null })
  }, [characterId])

  useEffect(() => {
    if (!hasStarted && characterId) {
      startConversation()
      setHasStarted(true)
    }
  }, [hasStarted, characterId, startConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-scroll when dynamic suggestions appear
  useEffect(() => {
    if (dynamicSuggestions.length > 0) {
      // New suggestions appeared, scroll to bottom to show them
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 200) // Small delay to allow for animation
    }
  }, [dynamicSuggestions.length])

  useEffect(() => {
    const focusInput = () => {
      if (!isLoading && !isUserLoading && characterId) {
        inputRef.current?.focus()
      }
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ensures we don't focus the input if the user is already typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      focusInput()
    }

    // Focus input on mount and loading state changes
    focusInput()

    // Focus input on any key press
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isLoading, isUserLoading, characterId])

  const handleCharacterSelect = (selectedCharacter: CharacterId) => {
    setCharacterId(selectedCharacter)
    localStorage.setItem('historyTutorCharacter', selectedCharacter)
    setShowCharacterSelection(false)
  }

  const handleCharacterSettingsClick = () => {
    setShowSettings(true)
  }

  /**
   * Delete a chat thread from the local state. DB deletion handled by server API.
   * @param deletedThreadId The ID of the thread to delete
   */
  const handleThreadDelete = (deletedThreadId: string) => {
    setChatThreads(prev => prev.filter(thread => thread.id !== deletedThreadId))
  }

  const loadThreadMessages = async (threadId: string) => {
    if (!isSupabaseAvailable() || !supabase) return

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error loading thread messages:", error)
      } else if (data) {
        const formattedMessages: Message[] = data.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }))
        setMessages(formattedMessages)
        setActiveHighlight({ messageId: null, sentenceId: null })
      }
    } catch (error) {
      console.error("Error in loadThreadMessages:", error)
    }
  }

  const handleTopicSelect = (topic: string, prefix: string = "Tell me about") => {
    const message = `${prefix} ${topic}`
    setInput(message)
    handleSubmit(undefined, message)
  }

  const handleSubmit = async (e?: React.FormEvent, customMessage?: string) => {
    e?.preventDefault()
    const messageText = customMessage || input
    if (!messageText.trim() || isLoading || isUserLoading || !characterId) return

    setDynamicSuggestions([])
    setActiveHighlight({ messageId: null, sentenceId: null })

    if (frameHandlerRef.current) {
      frameHandlerRef.current.stopAudio()
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      let userId = user?.id

      if (!userId && isSupabaseAvailable() && supabase) {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        userId = currentUser?.id
      }

      const characterObj = getCharacter(characterId)
      const response = await fetch("/api/chat-with-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          threadId: currentThreadId,
          userId: userId,
          characterId: characterId,
          systemPrompt: characterObj.prompt,
        }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader available")

      const assistantMessageObj: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessageObj])

      if (!frameHandlerRef.current) {
        // Handler for streaming text content updates
        const handleTextUpdate = (content: string) => {
          const currentMessageId = frameHandlerRef.current?.getCurrentMessageId()
          if (currentMessageId) {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id === currentMessageId) {
                  return { ...msg, content: msg.content + content }
                }
                return msg
              })
            )
          }
        }

        // Handler for server status updates (errors, completion, etc.)
        const handleStatusUpdate = (status: string, message?: string) => {
          console.log('Status update:', status, message)
        }

        // Handler for AI-generated conversation suggestions
        const handleSuggestionsUpdate = (suggestions: string[]) => {
          setDynamicSuggestions(suggestions)
        }

        // Handler for sentence highlighting data (for current message only)
        const handleSentenceHighlights = (_messageId: string, sentenceSpans: SentenceSpan[]) => {
          setCurrentMessageSentenceHighlights(sentenceSpans)
        }

        // Handler for active sentence highlighting during audio playback
        const handleActiveHighlight = (messageId: string | null, sentenceId: string | null) => {
          setActiveHighlight({ messageId, sentenceId })
        }

        frameHandlerRef.current = new ClientFrameHandler(
          handleTextUpdate,
          handleStatusUpdate,
          handleSuggestionsUpdate,
          handleSentenceHighlights,
          handleActiveHighlight
        )
      }

      // Tell the handler which message we're looking at
      frameHandlerRef.current.startMessage(assistantMessageObj.id)

      frameHandlerRef.current.setAudioEnabled(isAudioEnabled)

      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        buffer += chunk

        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const startString = "data: "
          if (line.startsWith(startString)) {
            const data = line.slice(startString.length)
            if (data === "[DONE]") break

            if (frameHandlerRef.current) {
              frameHandlerRef.current.handleFrameData(data)
            }
          }
        }
      }

    } catch {
      console.error("Chat error")
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled)
    if (frameHandlerRef.current) {
      frameHandlerRef.current.setAudioEnabled(!isAudioEnabled)
    }
  }

  // Don't render the main chat interface until age group is selected
  if (showCharacterSelection) {
    return <CharacterSelectionModal onSelect={handleCharacterSelect} />
  }


  return (
    <SidebarProvider defaultOpen={true} className="h-screen">
      <AppSidebar
        user={user}
        chatThreads={chatThreads}
        onThreadSelect={(threadId) => {
          setCurrentThreadId(threadId)
          if (threadId) {
            loadThreadMessages(threadId)
          } else {
            startConversation()
          }
        }}
        currentThreadId={currentThreadId}
        onThreadDelete={handleThreadDelete}
        onCharacterSettingsClick={handleCharacterSettingsClick}
        currentCharacter={characterId}
      />
      <SidebarInset>
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="md:hidden" />
              <GraduationCap className="size-8 hidden md:block text-muted-foreground" />
              <div className="flex flex-col">
                <h1 className="text-2xl font-semibold text-foreground">
                  Time Travel Academy
                </h1>
                <p className="text-sm text-muted-foreground">
                  Your personal history tutor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hidden md:flex" title="Toggle Sidebar (⌘B)" />
              <Button
                variant="outline"
                size="icon"
                onClick={toggleAudio}
                className={cn("transition-colors", isAudioEnabled ? "text-blue-600" : "text-gray-400")}
              >
                {isAudioEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </Button>
            </div>
          </header>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full px-6">
              <div className="space-y-4 py-6">
                {messages.map((message) => (
                  <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                    <Card
                      className={cn("max-w-[80%] p-2", message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-50")}
                    >
                      <CardContent className="px-2">
                        {message.role === "assistant" ? (
                          <HighlightedMessage
                            content={message.content}
                            currentlyPlayingSentenceId={activeHighlight?.sentenceId || null}
                            isCurrentMessage={activeHighlight?.messageId === message.id}
                            sentences={currentMessageSentenceHighlights}
                          />
                        ) : (
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                        <div
                          className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span>Loading...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          <div className="p-6">
            {characterId && (
              <>
                {dynamicSuggestions.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-in-up">
                    {dynamicSuggestions.map((suggestion: string, index: number) => (
                      <div
                        key={`dynamic-${index}`}
                        className="animate-fade-in-up-stagger"
                        style={{
                          animationDelay: `${index * 150}ms`
                        }}
                      >
                        <SuggestedResponseBox
                          response={suggestion}
                          onSelect={() => handleTopicSelect(suggestion, "")}
                          disabled={isLoading}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {messages.length === 1 && dynamicSuggestions.length === 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-6 animate-in fade-in-0 duration-300">
                    {getCharacter(characterId).suggestedTopics.map((topic: string) => (
                      <SuggestedResponseBox
                        key={topic}
                        response={topic}
                        onSelect={() => handleTopicSelect(topic)}
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about history..."
                disabled={isLoading || isUserLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || isUserLoading || !input.trim()}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>

        </div>
      </SidebarInset>

      {characterId && (
        <SettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          currentCharacter={characterId}
          onCharacterSelect={(newCharacter) => {
            setCharacterId(newCharacter)
            localStorage.setItem('historyTutorCharacter', newCharacter)
            setMessages([])
            setDynamicSuggestions([])
            setActiveHighlight({ messageId: null, sentenceId: null })
            setCurrentThreadId(null)
            setHasStarted(false)
            setShowSettings(false)
          }}
        />
      )}
    </SidebarProvider>
  )
}
