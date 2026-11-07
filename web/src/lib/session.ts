import { cookies } from "next/headers";

import { SESSION_COOKIE, readSessionToken, signSession, type SessionToken } from "@/lib/session-token";
import type { Session } from "@/lib/types";
import { findUser, type StoredUser } from "@/lib/users";

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

const DAY = 60 * 60 * 24;
/** "Keep me signed in": a cookie that survives closing the browser. */
const REMEMBER_SECONDS = 30 * DAY;
/** Without it: a browser-session cookie, and the token itself still dies after 12 hours. */
const SHORT_SECONDS = 12 * 60 * 60;

export async function getSession(): Promise<Session> {
  const jar = await cookies();
  const token = readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!token) return { kind: "none" };
  if (token.kind === "guest") return { kind: "guest" };
  if (!token.email) return { kind: "none" };

  const user = await findUser(token.email);
  if (!user) return { kind: "none" };

  return {
    kind: "user",
    name: user.name,
    email: user.email,
    role: user.role,
    downloadsUsed: user.downloadsUsed,
  };
}

async function writeCookie(token: Omit<SessionToken, "exp">, remember: boolean) {
  const seconds = remember ? REMEMBER_SECONDS : SHORT_SECONDS;
  const value = signSession({ ...token, exp: Date.now() + seconds * 1000 });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, remember ? { ...baseCookie, maxAge: seconds } : baseCookie);
}

export async function setGuestSession() {
  await writeCookie({ kind: "guest" }, true);
}

export async function setUserSession(user: StoredUser, remember: boolean) {
  await writeCookie({ kind: "user", email: user.email, role: user.role }, remember);
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
