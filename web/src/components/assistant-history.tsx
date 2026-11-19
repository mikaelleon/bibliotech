"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatSummary } from "@/lib/assistant/chat";
import { cn } from "@/lib/utils";

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * The reader's saved chats. Deleting asks first, inline, because a deleted chat can't be brought
 * back. The row leaves the list as soon as the reader confirms.
 */
export function AssistantHistory({
  chats,
  error,
  activeId,
  onOpen,
  onDelete,
  onDeleteAll,
}: {
  chats: ChatSummary[] | null;
  error: string | null;
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
}) {
  const [confirm, setConfirm] = useState<string | "all" | null>(null);

  return (
    <div>
      <p className="text-sm leading-5 font-medium">Your chats</p>
      {error ? <p className="mt-2 text-sm leading-5 text-muted-foreground">{error}</p> : null}

      {chats === null && !error ? (
        <div className="mt-3 flex flex-col gap-3" aria-hidden>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </div>
      ) : null}

      {chats && chats.length === 0 && !error ? (
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          No saved chats yet. Your conversations will show up here.
        </p>
      ) : null}

      {chats && chats.length > 0 ? (
        <ul className="mt-1">
          {chats.map((chat) => (
            <li key={chat.id} className="border-b border-border last:border-b-0">
              {confirm === chat.id ? (
                <div className="flex items-center justify-between gap-2 py-2">
                  <p className="min-w-0 flex-1 text-sm leading-5">Delete this chat?</p>
                  <Button
                    type="button"
                    className="min-h-9 px-4 text-xs"
                    onClick={() => {
                      setConfirm(null);
                      onDelete(chat.id);
                    }}
                  >
                    Delete
                  </Button>
                  <Button type="button" variant="outline" className="min-h-9 px-4 text-xs" onClick={() => setConfirm(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => onOpen(chat.id)}
                    aria-current={chat.id === activeId ? "true" : undefined}
                    className={cn("press min-h-11 min-w-0 flex-1 py-2 text-left", chat.id === activeId && "font-medium")}
                  >
                    <span className="block truncate text-sm leading-5">{chat.title}</span>
                    <span className="block text-xs leading-4 text-muted-foreground">{when(chat.updatedAt)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm(chat.id)}
                    aria-label={`Delete chat: ${chat.title}`}
                    className="press inline-flex size-11 shrink-0 items-center justify-center text-muted-foreground"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-4 text-xs leading-4 text-muted-foreground">
        Chats are saved to your account for up to 90 days of inactivity. You can delete them any time.
      </p>

      {chats && chats.length > 1 ? (
        confirm === "all" ? (
          <div className="mt-2 flex items-center gap-2">
            <p className="flex-1 text-sm leading-5">Delete all chats?</p>
            <Button
              type="button"
              className="min-h-9 px-4 text-xs"
              onClick={() => {
                setConfirm(null);
                onDeleteAll();
              }}
            >
              Delete all
            </Button>
            <Button type="button" variant="outline" className="min-h-9 px-4 text-xs" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm("all")} className="press mt-1 min-h-11 text-sm leading-5 text-brand-text underline underline-offset-4">
            Delete all chats
          </button>
        )
      ) : null}
    </div>
  );
}
