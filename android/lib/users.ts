/**
 * Client-side form rules and a login throttle. Accounts live in Supabase Auth
 * (see lib/session.tsx); Supabase also rate-limits sign-in attempts on the server.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use ${PASSWORD_MAX} characters or fewer.`;
  return null;
}

/** Same thresholds as the web login: 5 wrong passwords per account per 15 minutes. */
const LOCK_MAX = 5;
const LOCK_WINDOW_MS = 15 * 60_000;
const failures = new Map<string, { count: number; resetAt: number }>();

export function lockedFor(email: string): number {
  const entry = failures.get(email.trim().toLowerCase());
  const now = Date.now();
  if (!entry || entry.resetAt <= now) return 0;
  return entry.count >= LOCK_MAX ? entry.resetAt - now : 0;
}

export function recordFailure(email: string): void {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= now) failures.set(key, { count: 1, resetAt: now + LOCK_WINDOW_MS });
  else entry.count += 1;
}

export function clearFailures(email: string): void {
  failures.delete(email.trim().toLowerCase());
}
