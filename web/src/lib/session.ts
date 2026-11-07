import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { GUEST_LIMIT, USER_LIMIT } from "@/lib/quota";
import { createClient } from "@/lib/supabase/server";
import { SHORT_SESSION_COOKIE } from "@/lib/supabase/env";
import type { Session } from "@/lib/types";
import { VISITOR_COOKIE } from "@/lib/visitor";

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

const VISITOR_SECONDS = 30 * 60 * 60 * 24;

/**
 * The signed-in account, verified with getClaims() (never getSession() on the server).
 * Cached per request so layouts and pages share one lookup.
 */
export const getSession = cache(async (): Promise<Session> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    const jar = await cookies();
    return jar.get(VISITOR_COOKIE)?.value === "1" ? { kind: "guest" } : { kind: "none" };
  }

  const [{ data: profile }, { data: quota }] = await Promise.all([
    supabase.from("profiles").select("display_name, role, email_verified_at").eq("id", claims.sub).maybeSingle(),
    supabase.rpc("my_quota"),
  ]);
  if (!profile) return { kind: "none" };
  const q = readQuota(quota, Boolean(profile.email_verified_at));

  const email = typeof claims.email === "string" ? claims.email : "";
  return {
    kind: "user",
    id: claims.sub,
    name: profile.display_name || email.split("@")[0] || "Reader",
    email,
    role: profile.role === "admin" ? "admin" : "user",
    verified: Boolean(profile.email_verified_at),
    downloadsUsed: q.used,
    downloadLimit: q.limit,
    resetsAt: q.resetsAt,
  };
});

type QuotaRow = { used?: number; limit?: number; resetsAt?: string };

/** my_quota() result, or the tier limit with nothing used when it can't be read. */
function readQuota(value: unknown, verified: boolean): { used: number; limit: number; resetsAt: string | null } {
  const row = (value ?? {}) as QuotaRow;
  return {
    used: typeof row.used === "number" ? row.used : 0,
    limit: typeof row.limit === "number" ? row.limit : verified ? USER_LIMIT : GUEST_LIMIT,
    resetsAt: typeof row.resetsAt === "string" ? row.resetsAt : null,
  };
}

/** "Continue as guest": browse without an account. Signs out any account first. */
export async function setGuestSession() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  const jar = await cookies();
  jar.set(VISITOR_COOKIE, "1", { ...baseCookie, maxAge: VISITOR_SECONDS });
}

/**
 * Call before signing in. With `remember` off, Supabase's auth cookies are written without
 * max-age, so the session ends when the browser closes.
 */
export async function setSessionLength(remember: boolean) {
  const jar = await cookies();
  if (remember) jar.delete(SHORT_SESSION_COOKIE);
  else jar.set(SHORT_SESSION_COOKIE, "1", baseCookie);
  jar.delete(VISITOR_COOKIE);
}

export async function clearSession() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  const jar = await cookies();
  jar.delete(VISITOR_COOKIE);
  jar.delete(SHORT_SESSION_COOKIE);
}
