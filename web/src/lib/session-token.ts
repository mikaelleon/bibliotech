import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "elib_session";

export type SessionToken = {
  kind: "guest" | "user";
  email?: string;
  role?: "user" | "admin";
};

function secret(): string {
  return process.env.SESSION_SECRET ?? "elib-dev-session-secret";
}

/** Signed cookie body. The signature stops a visitor editing their own role. */
export function signSession(token: SessionToken): string {
  const body = Buffer.from(JSON.stringify(token)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readSessionToken(value: string | undefined): SessionToken | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");

  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionToken;
    if (parsed.kind !== "guest" && parsed.kind !== "user") return null;
    return parsed;
  } catch {
    return null;
  }
}
