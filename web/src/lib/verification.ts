import "server-only";

import { createHash, randomBytes } from "crypto";

import { appOrigin } from "@/lib/app-origin";
import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN_TTL_MS = 24 * 60 * 60_000;
const COOLDOWN_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;
const MAX_PER_DAY = 5;

export type SendVerificationResult =
  | { status: "sent"; dev?: boolean }
  | { status: "already_verified" }
  | { status: "cooldown"; retryAfterSeconds: number }
  | { status: "daily_limit" }
  | { status: "no_email" }
  | { status: "failed" };

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a one-time link (random 32 bytes, only its SHA-256 hash stored, 24 hour expiry) and
 * emails it. Limits come from the stored rows, so they hold across web, Android and restarts:
 * one email per 60 seconds and five per day per account.
 */
export async function sendVerification(userId: string, email: string): Promise<SendVerificationResult> {
  if (!email) return { status: "no_email" };
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("email_verified_at").eq("id", userId).maybeSingle();
  if (!profile) return { status: "failed" };
  if (profile.email_verified_at) return { status: "already_verified" };

  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { data: recent, error: recentError } = await admin
    .from("email_verifications")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (recentError) {
    console.error("[verify] could not read recent links", recentError.message);
    return { status: "failed" };
  }
  const latest = recent?.[0] ? Date.parse(recent[0].created_at) : 0;
  const waitMs = latest + COOLDOWN_MS - Date.now();
  if (waitMs > 0) return { status: "cooldown", retryAfterSeconds: Math.ceil(waitMs / 1000) };
  if ((recent?.length ?? 0) >= MAX_PER_DAY) return { status: "daily_limit" };

  const token = randomBytes(32).toString("base64url");
  const { data: row, error } = await admin
    .from("email_verifications")
    .insert({
      user_id: userId,
      email,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    })
    .select("id")
    .single();
  if (error || !row) {
    console.error("[verify] could not store link", error?.message);
    return { status: "failed" };
  }

  const link = `${await appOrigin()}/api/auth/verify?token=${token}`;
  const sent = await sendEmail({
    to: email,
    subject: "Verify your email for Bibliotech",
    text: `Open this link to verify your email and raise your download limit from 5 to 10 a month:\n\n${link}\n\nThe link works once and expires in 24 hours. If you didn't create an account, ignore this email.`,
    html: `<p>Open this link to verify your email and raise your download limit from 5 to 10 a month:</p><p><a href="${link}">Verify my email</a></p><p>The link works once and expires in 24 hours. If you didn't create an account, ignore this email.</p>`,
  });
  if (!sent.ok) {
    // Don't count a link the user never received against their cooldown or daily limit.
    await admin.from("email_verifications").delete().eq("id", row.id);
    return { status: "failed" };
  }
  return sent.dev ? { status: "sent", dev: true } : { status: "sent" };
}

export type VerifyTokenStatus = "verified" | "already_verified" | "invalid" | "used" | "expired" | "email_changed" | "error";

/** Checks and uses a token in one database transaction (verify_email_token). */
export async function verifyToken(token: string): Promise<VerifyTokenStatus> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return "invalid";
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("verify_email_token", { p_token_hash: hashToken(token) });
  if (error) {
    console.error("[verify] verify_email_token failed", error.message);
    return "error";
  }
  const status = (data as { status?: string } | null)?.status;
  const known: VerifyTokenStatus[] = ["verified", "already_verified", "invalid", "used", "expired", "email_changed"];
  return known.includes(status as VerifyTokenStatus) ? (status as VerifyTokenStatus) : "error";
}

/** Plain-language message for a send result, shared by the web action and the API. */
export function sendMessage(result: SendVerificationResult): string {
  switch (result.status) {
    case "sent":
      return result.dev
        ? "No email service is set up, so the link was printed in the server console."
        : "Link sent. Check your inbox.";
    case "already_verified":
      return "Your email is already verified.";
    case "cooldown":
      return `Wait ${result.retryAfterSeconds} seconds before sending another link.`;
    case "daily_limit":
      return "You've asked for 5 links today. Try again tomorrow.";
    case "no_email":
      return "Your account has no email address.";
    default:
      return "We couldn't send the link. Try again in a moment.";
  }
}
