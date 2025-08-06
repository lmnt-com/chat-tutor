"use client";

import { useState } from "react";
import {
  MessageSquare,
  Plus,
  Settings,
  User,
  Trash2,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthDialog } from "@/components/auth-dialog";
import { createClient, isSupabaseAvailable } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { CharacterId, getCharacter } from "@/lib/characters";

interface ChatThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface AppSidebarProps {
  user: { id: string; email?: string } | null;
  chatThreads: ChatThread[];
  onThreadSelect: (threadId: string) => void;
  currentThreadId: string | null;
  onThreadDelete?: (threadId: string) => void;
  onCharacterSettingsClick: () => void;
  currentCharacter?: CharacterId | null;
}

export function AppSidebar({
  user,
  chatThreads,
  onThreadSelect,
  currentThreadId,
  onThreadDelete,
  onCharacterSettingsClick,
  currentCharacter,
}: AppSidebarProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const supabase = createClient();
  const { state } = useSidebar();

  const handleSignOut = async () => {
    if (isSupabaseAvailable() && supabase) {
      await supabase.auth.signOut();
    }
    window.location.reload();
  };

  const startNewChat = () => {
    onThreadSelect("");
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent thread selection when clicking delete

    if (
      !confirm(
        "Are you sure you want to delete this chat thread? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingThreadId(threadId);

    try {
      const response = await fetch(`/api/chat-threads/${threadId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Call the parent callback to update the UI
        if (onThreadDelete) {
          onThreadDelete(threadId);
        }

        // If we're currently viewing the deleted thread, start a new chat
        if (currentThreadId === threadId) {
          onThreadSelect("");
        }
      } else {
        console.error("Failed to delete chat thread");
        alert("Failed to delete chat thread. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting chat thread:", error);
      alert("Error deleting chat thread. Please try again.");
    } finally {
      setDeletingThreadId(null);
    }
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        {state === "expanded" ? (
          <Button
            onClick={startNewChat}
            className="w-full justify-start bg-transparent"
            variant="outline"
          >
            <Plus className="size-4 mr-2" />
            New Chat
          </Button>
        ) : (
          <SidebarMenuButton onClick={startNewChat} tooltip="New Chat">
            <Plus className="size-4" />
          </SidebarMenuButton>
        )}
      </SidebarHeader>

      <SidebarContent>
        {user && chatThreads.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Chat History</SidebarGroupLabel>
            <SidebarGroupContent>
              <ScrollArea className="h-[400px]">
                <SidebarMenu>
                  {chatThreads.map((thread) => (
                    <SidebarMenuItem key={thread.id} className="group">
                      <div className="flex items-center w-full gap-1">
                        <SidebarMenuButton
                          onClick={() => onThreadSelect(thread.id)}
                          className={cn(
                            "w-46 justify-start",
                            currentThreadId === thread.id && "bg-accent",
                          )}
                          tooltip={thread.title}
                        >
                          <MessageSquare className="size-4" />
                          <span className="truncate">{thread.title}</span>
                        </SidebarMenuButton>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteThread(thread.id, e)}
                          disabled={deletingThreadId === thread.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:text-destructive-foreground"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </ScrollArea>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {currentCharacter && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onCharacterSettingsClick}
                tooltip="Change Character"
              >
                <Users className="size-4" />
                <span className="truncate">
                  {getCharacter(currentCharacter).displayName}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {user ? (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={user.email}>
                  <User className="size-4" />
                  <span className="truncate">{user.email}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} tooltip="Sign Out">
                  <Settings className="size-4" />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          ) : (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setShowAuthDialog(true)}>
                  <User className="size-4" />
                  <span>Sign In</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </Sidebar>
  );
}
