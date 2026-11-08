import type { Session } from "@/lib/types";

/**
 * Copy only (sign-up text, fallbacks). Real limits come from quota_limits through my_quota(),
 * and request_download() enforces them.
 */
export const GUEST_LIMIT = 5;
export const USER_LIMIT = 10;
/** At or below this many, the count turns to the accent colour. */
const LOW_AT = 2;

export type Quota = {
  /** Visitor without an account ("Continue as guest"). */
  guest: boolean;
  /** Signed-up account whose email isn't verified yet: Guest tier, limit 5. */
  unverified: boolean;
  limit: number;
  used: number;
  left: number;
  low: boolean;
  /** End of the current monthly period (ISO), when the count resets. */
  resetsAt: string | null;
};

/**
 * Download allowance for a session. Admins and signed-out visitors have none.
 * Used, limit and reset time come from my_quota() in the database: unverified accounts get 5,
 * verified accounts 10, counted per monthly period from the registration date.
 */
export function quotaFor(session: Session): Quota | null {
  if (session.kind === "guest") {
    return { guest: true, unverified: false, limit: GUEST_LIMIT, used: 0, left: GUEST_LIMIT, low: false, resetsAt: null };
  }
  if (session.kind !== "user" || session.role === "admin") return null;
  const limit = session.downloadLimit;
  const used = Math.max(0, Math.min(limit, session.downloadsUsed));
  const left = limit - used;
  return { guest: false, unverified: !session.verified, limit, used, left, low: left <= LOW_AT, resetsAt: session.resetsAt };
}

/** "Dec 14" for a reset time. Shown as the UTC date, the same on server and client renders. */
export function resetLabel(resetsAt: string | null): string | null {
  if (!resetsAt) return null;
  const date = new Date(resetsAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** The line under the meter for a signed-in reader. */
export function quotaNote(quota: Quota): string {
  const reset = resetLabel(quota.resetsAt);
  const resets = reset ? ` Resets on ${reset}.` : "";
  if (quota.unverified) {
    return quota.left === 0
      ? `You've used all ${quota.limit} downloads this month. Verify your email to unlock ${USER_LIMIT - GUEST_LIMIT} more.`
      : `Verify your email to raise your monthly limit from ${GUEST_LIMIT} to ${USER_LIMIT}.${resets}`;
  }
  return quota.left === 0
    ? `You've used all ${quota.limit} downloads this month.${resets}`
    : `${quota.limit} downloads a month.${resets}`;
}

/** Tell the header meter about a download without waiting for the layout to render again. */
export function publishQuota(used: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("elib-quota", { detail: { used } }));
}

/** "5 downloads left", "1 download left", "No downloads left". */
export function leftLabel(left: number): string {
  if (left === 0) return "No downloads left";
  return left === 1 ? "1 download left" : `${left} downloads left`;
}
