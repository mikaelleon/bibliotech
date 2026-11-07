import type { Session } from "@/lib/types";

export const GUEST_LIMIT = 5;
export const USER_LIMIT = 10;
/** At or below this many, the count turns to the accent colour. */
const LOW_AT = 2;

export type Quota = {
  guest: boolean;
  limit: number;
  used: number;
  left: number;
  low: boolean;
};

/** Download allowance for a session. Admins and signed-out visitors have none. Guest downloads aren't counted yet. */
export function quotaFor(session: Session): Quota | null {
  if (session.kind === "guest") {
    return { guest: true, limit: GUEST_LIMIT, used: 0, left: GUEST_LIMIT, low: false };
  }
  if (session.kind !== "user" || session.role === "admin") return null;
  const used = Math.max(0, Math.min(USER_LIMIT, session.downloadsUsed));
  const left = USER_LIMIT - used;
  return { guest: false, limit: USER_LIMIT, used, left, low: left <= LOW_AT };
}

/** "5 downloads left", "1 download left", "No downloads left". */
export function leftLabel(left: number): string {
  if (left === 0) return "No downloads left";
  return left === 1 ? "1 download left" : `${left} downloads left`;
}
