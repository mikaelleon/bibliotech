import { apiError, apiJson } from "@/lib/api-response";
import { blockedFor, hit, type Limit } from "@/lib/rate-limit";
import { requestUser } from "@/lib/supabase/request";
import { sendMessage, sendVerification } from "@/lib/verification";

/** Per-address cap on top of the per-account limits stored in the database. */
const ipLimit: Limit = { max: 20, windowMs: 60 * 60_000 };

function ipOf(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

/** POST /api/auth/send-verification. Auth: Supabase cookie (web) or Bearer token (Android). */
export async function POST(request: Request) {
  const user = await requestUser(request);
  if (!user) return apiError(401, "UNAUTHENTICATED", "Log in to verify your email.");

  const key = `verify:ip:${ipOf(request)}`;
  const wait = blockedFor(key, ipLimit);
  if (wait) return apiError(429, "RATE_LIMITED", "Too many requests. Try again later.", { retryAfterSeconds: Math.ceil(wait / 1000) });
  hit(key, ipLimit);

  const result = await sendVerification(user.id, user.email);
  const message = sendMessage(result);
  switch (result.status) {
    case "sent":
      return apiJson({ status: "sent", message });
    case "already_verified":
      return apiJson({ status: "already_verified", message });
    case "cooldown":
      return apiError(429, "COOLDOWN", message, { retryAfterSeconds: result.retryAfterSeconds });
    case "daily_limit":
      return apiError(429, "DAILY_LIMIT", message);
    case "no_email":
      return apiError(400, "NO_EMAIL", message);
    default:
      return apiError(502, "SEND_FAILED", message);
  }
}
