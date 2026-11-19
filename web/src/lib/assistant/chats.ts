import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_CHAT_MESSAGES } from "./chat-limits";
import type { ChatTurn } from "./filter";

type Row = { role: string; body: string };

/**
 * The last turns of a stored chat, read with the caller's own client so row level security only
 * ever returns their rows. `count` is the total stored, for the per-chat cap. Null means the read
 * failed (for example the table is missing): the caller falls back to the history the client sent.
 */
export async function loadChatHistory(
  supabase: SupabaseClient,
  chatId: string,
  turns: number,
): Promise<{ turns: ChatTurn[]; count: number } | null> {
  const { data, error, count } = await supabase
    .from("ai_chat_messages")
    .select("role, body", { count: "exact" })
    .eq("chat_id", chatId)
    .order("seq", { ascending: false })
    .limit(Math.max(turns, 1));
  if (error) return null;
  const list = ((data ?? []) as Row[])
    .reverse()
    .filter((row): row is { role: "user" | "model"; body: string } => row.role === "user" || row.role === "model")
    .map((row) => ({ role: row.role, text: row.body }));
  return { turns: list, count: count ?? list.length };
}

export function chatIsFull(count: number): boolean {
  return count >= MAX_CHAT_MESSAGES;
}

/** Stores one question and answer. Failures are logged without any message text and never block the reply. */
export async function appendChatTurn(
  admin: SupabaseClient,
  turn: { userId: string; chatId: string; title: string; userText: string; modelText: string },
): Promise<{ status: string; title?: string } | null> {
  const { data, error } = await admin.rpc("append_ai_chat_turn", {
    p_user: turn.userId,
    p_chat: turn.chatId,
    p_title: turn.title,
    p_user_text: turn.userText,
    p_model_text: turn.modelText,
  });
  if (error) {
    console.error("assistant: append_ai_chat_turn failed", error.code);
    return null;
  }
  return data as { status: string; title?: string };
}
