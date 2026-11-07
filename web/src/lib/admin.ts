import { getBooks } from "@/lib/books";
import { countByCategory } from "@/lib/records";
import type { Session } from "@/lib/types";
import { listUsers } from "@/lib/users";

export function isAdminSession(session: Session): boolean {
  return session.kind === "user" && session.role === "admin";
}

/** Same refusal the database function raises when the caller is not an admin. */
export function assertAdmin(session: Session): void {
  if (!isAdminSession(session)) throw new Error("not allowed");
}

export async function adminStats(session: Session) {
  assertAdmin(session);
  const users = await listUsers();
  return {
    books: getBooks().length,
    registeredUsers: users.length,
    guestSessions: 0,
    downloads: 0,
    downloadsLast30Days: 0,
    booksByCategory: countByCategory(),
    mostDownloaded: [] as { title: string; count: number }[],
    recentDownloads: [] as { id: string; who: string; book: string; date: string }[],
    downloadsPerDay: last30Days(),
  };
}

/** One zero for each of the last 30 days. Downloads are not stored in the local files. */
function last30Days(): { date: string; count: number }[] {
  const points: { date: string; count: number }[] = [];
  const now = new Date();
  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    points.push({ date: day.toISOString().slice(0, 10), count: 0 });
  }
  return points;
}

export async function adminListUsers(session: Session, search: string, limit: number, offset: number) {
  assertAdmin(session);
  const needle = search.trim().toLowerCase();
  const users = (await listUsers()).filter((user) => {
    if (!needle) return true;
    return user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle);
  });
  return {
    total: users.length,
    rows: users.slice(offset, offset + limit).map((user) => ({
      id: user.email,
      email: user.email,
      name: user.name,
      role: user.role,
      downloadsUsed: user.downloadsUsed,
    })),
  };
}

export async function adminListDownloads(session: Session, limit: number, offset: number) {
  assertAdmin(session);
  const rows: { id: string; who: string; book: string; date: string }[] = [];
  return {
    total: rows.length,
    rows: rows.slice(offset, offset + limit),
  };
}
