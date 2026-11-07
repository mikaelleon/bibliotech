import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "elib_session";

export type SessionToken = {
  kind: "guest" | "user";
  email?: string;
  role?: "user" | "admin";
  /** Expiry as a Unix time in milliseconds. A token without one is rejected. */
  exp: number;
};

const devSecret = "elib-dev-session-secret";

/** Production refuses to sign or read sessions with the public development secret. */
export function sessionSecret(): string {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not set. Set it to a long random string before running in production.");
  }
  return devSecret;
}

/** HMAC with a purpose label, so a token signed for one use can't be replayed as another. */
export function sign(purpose: string, body: string): string {
  return createHmac("sha256", sessionSecret()).update(`${purpose}:${body}`).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Signed cookie body. The signature stops a visitor editing their own role or expiry. */
export function signSession(token: SessionToken): string {
  const body = Buffer.from(JSON.stringify(token)).toString("base64url");
  return `${body}.${sign("session", body)}`;
}

export function readSessionToken(value: string | undefined): SessionToken | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = value.slice(0, dot);
  if (!safeEqual(value.slice(dot + 1), sign("session", body))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionToken;
    if (parsed.kind !== "guest" && parsed.kind !== "user") return null;
    if (typeof parsed.exp !== "number" || parsed.exp <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
