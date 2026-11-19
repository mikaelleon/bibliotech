import { apiError, apiJson } from "@/lib/api-response";
import { requestUser } from "@/lib/supabase/request";

/** GET /api/assistant/quota — the caller's AI usage and limits. */
export async function GET(request: Request) {
  const user = await requestUser(request);
  if (!user) return apiError(401, "unauthenticated", "Log in to use the assistant.");

  const { data, error } = await user.supabase.rpc("my_ai_quota");
  if (error || !data) return apiError(500, "quota_unavailable", "We couldn't load your assistant quota.");
  return apiJson({ quota: data });
}
