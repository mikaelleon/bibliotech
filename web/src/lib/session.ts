import { cookies } from "next/headers";

import { SESSION_COOKIE, readSessionToken, signSession } from "@/lib/session-token";
import type { Session } from "@/lib/types";
import { findUser, type StoredUser } from "@/lib/users";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

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

async function writeCookie(value: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, cookieOptions);
}

export async function setGuestSession() {
  await writeCookie(signSession({ kind: "guest" }));
}

export async function setUserSession(user: StoredUser) {
  await writeCookie(signSession({ kind: "user", email: user.email, role: user.role }));
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
