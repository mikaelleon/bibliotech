import { apiError, apiJson } from "@/lib/api-response";
import { requestUser } from "@/lib/supabase/request";

type QuotaRow = { tier: string; used: number; limit: number; periodStart: string; resetsAt: string };

/** GET /api/me — tier, verified state, role and the current quota period. */
export async function GET(request: Request) {
  const user = await requestUser(request);
  if (!user) return apiError(401, "UNAUTHENTICATED", "Log in to see your account.");

  const [{ data: profile }, { data: quota, error }] = await Promise.all([
    user.supabase.from("profiles").select("display_name, role, email_verified_at").eq("id", user.id).maybeSingle(),
    user.supabase.rpc("my_quota"),
  ]);
  if (!profile || error || !quota) return apiError(500, "ACCOUNT_UNAVAILABLE", "We couldn't load your account.");
  const q = quota as QuotaRow;

  return apiJson({
    id: user.id,
    email: user.email,
    name: profile.display_name,
    role: profile.role,
    tier: q.tier,
    verified: Boolean(profile.email_verified_at),
    used: q.used,
    limit: q.limit,
    periodStart: q.periodStart,
    resetsAt: q.resetsAt,
  });
}
