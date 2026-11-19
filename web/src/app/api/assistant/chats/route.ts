import { apiError, apiJson } from "@/lib/api-response";
import type { ChatSummary } from "@/lib/assistant/chat";
import { MAX_CHATS } from "@/lib/assistant/chat-limits";
import { requestUser } from "@/lib/supabase/request";

/** GET /api/assistant/chats — the caller's chat sessions, most recently used first. */
export async function GET(request: Request) {
  const user = await requestUser(request);
  if (!user) return apiError(401, "unauthenticated", "Log in to see your chats.");

  const { data, error } = await user.supabase
    .from("ai_chats")
    .select("id, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(MAX_CHATS);
  if (error) return apiError(500, "chats_unavailable", "We couldn't load your chats.");

  const chats: ChatSummary[] = (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    updatedAt: row.updated_at as string,
  }));
  return apiJson({ chats });
}

/** DELETE /api/assistant/chats — deletes every chat of the caller. */
export async function DELETE(request: Request) {
  const user = await requestUser(request);
  if (!user) return apiError(401, "unauthenticated", "Log in to manage your chats.");

  const { error } = await user.supabase.from("ai_chats").delete().eq("user_id", user.id);
  if (error) return apiError(500, "delete_failed", "We couldn't delete your chats. Try again.");
  return apiJson({ ok: true });
}
