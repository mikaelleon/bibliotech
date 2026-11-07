import { safeEqual, sign } from "@/lib/session-token";
import { findUser, passwordFingerprint, type StoredUser } from "@/lib/users";

const RESET_TTL_MS = 30 * 60_000;

type ResetBody = { email: string; exp: number; fp: string };

/**
 * Signed, 30-minute reset token. It carries a fingerprint of the current password hash,
 * so it stops working as soon as the password changes: each link resets once.
 */
export function createResetToken(user: StoredUser): string {
  const body: ResetBody = { email: user.email, exp: Date.now() + RESET_TTL_MS, fp: passwordFingerprint(user) };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${encoded}.${sign("reset", encoded)}`;
}

/** The account the token may reset, or null when it is forged, expired or already used. */
export async function readResetToken(token: string | undefined): Promise<StoredUser | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  if (!safeEqual(token.slice(dot + 1), sign("reset", encoded))) return null;

  try {
    const body = JSON.parse(Buffer.from(encoded, "base64url").toString()) as ResetBody;
    if (typeof body.exp !== "number" || body.exp <= Date.now()) return null;
    const user = await findUser(body.email);
    if (!user || !safeEqual(body.fp, passwordFingerprint(user))) return null;
    return user;
  } catch {
    return null;
  }
}
