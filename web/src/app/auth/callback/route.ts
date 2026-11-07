import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/lib/auth-rules";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for Supabase email links (password reset now, more later).
 * Exchanges the one-time code for a session, then opens `next` on this site only.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next")) ?? "/browse";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    console.error("[auth] code exchange failed", error.code, error.message);
  }

  const failed = new URL(next === "/reset-password" ? "/reset-password" : "/login", request.url);
  failed.searchParams.set("expired", "1");
  return NextResponse.redirect(failed);
}
