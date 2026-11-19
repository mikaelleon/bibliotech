import { apiError, apiJson } from "@/lib/api-response";
import { isUuid, type StoredMessage } from "@/lib/assistant/chat";
import { MAX_CHAT_MESSAGES } from "@/lib/assistant/chat-limits";
import { requestUser } from "@/lib/supabase/request";

/** GET /api/assistant/chats/:id — one chat and its messages, oldest first. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requestUser(request);
  if (!user) return apiError(401, "unauthenticated", "Log in to see your chats.");
  const { id } = await context.params;
  if (!isUuid(id)) return apiError(404, "chat_not_found", "That chat doesn't exist.");

  // Row level security limits both reads to the caller's own rows.
  const chat = await user.supabase.from("ai_chats").select("id, title").eq("id", id).maybeSingle();
  if (chat.error) return apiError(500, "chats_unavailable", "We couldn't load that chat.");
  if (!chat.data) return apiError(404, "chat_not_found", "That chat doesn't exist.");

  const { data, error } = await user.supabase
    .from("ai_chat_messages")
    .select("id, role, body")
    .eq("chat_id", id)
    .order("seq", { ascending: true })
    .limit(MAX_CHAT_MESSAGES);
  if (error) return apiError(500, "chats_unavailable", "We couldn't load that chat.");

  const messages: StoredMessage[] = (data ?? []).flatMap((row) =>
    row.role === "user" || row.role === "model" ? [{ id: row.id as string, role: row.role, text: row.body as string }] : [],
  );
  return apiJson({ chat: { id: chat.data.id, title: chat.data.title }, messages });
}

/** DELETE /api/assistant/chats/:id — deletes one chat and its messages. */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requestUser(request);
  if (!user) return apiError(401, "unauthenticated", "Log in to manage your chats.");
  const { id } = await context.params;
  if (!isUuid(id)) return apiError(404, "chat_not_found", "That chat doesn't exist.");

  const { error } = await user.supabase.from("ai_chats").delete().eq("id", id).eq("user_id", user.id);
  if (error) return apiError(500, "delete_failed", "We couldn't delete that chat. Try again.");
  return apiJson({ ok: true });
}
