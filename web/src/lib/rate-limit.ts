import { headers } from "next/headers";

/**
 * Fixed-window counters held in this server process. Enough for the single-node
 * JSON store this repo runs on; a multi-instance deploy needs a shared store (Redis etc.).
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type Limit = { max: number; windowMs: number };

export const limits = {
  /** Wrong passwords for one account. */
  loginEmail: { max: 5, windowMs: 15 * 60_000 },
  /** Wrong passwords from one address, across accounts. */
  loginIp: { max: 20, windowMs: 15 * 60_000 },
  register: { max: 10, windowMs: 60 * 60_000 },
  resetRequest: { max: 5, windowMs: 15 * 60_000 },
} satisfies Record<string, Limit>;

function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

/** Milliseconds until the key may try again, or 0 when it is under the limit. Does not count. */
export function blockedFor(key: string, limit: Limit): number {
  const bucket = buckets.get(key);
  const now = Date.now();
  if (!bucket || bucket.resetAt <= now) return 0;
  return bucket.count >= limit.max ? bucket.resetAt - now : 0;
}

/** Counts one attempt. */
export function hit(key: string, limit: Limit): void {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + limit.windowMs });
    return;
  }
  bucket.count += 1;
}

export function clear(key: string): void {
  buckets.delete(key);
}

export async function clientIp(): Promise<string> {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "local";
}

export function waitMessage(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
