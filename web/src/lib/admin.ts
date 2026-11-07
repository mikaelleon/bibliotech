import { getBooks } from "@/lib/books";
import { countByCategory } from "@/lib/records";
import type { Session } from "@/lib/types";
import { listUsers } from "@/lib/users";

export function isAdminSession(
  session: Session,
): session is Extract<Session, { kind: "user" }> & { role: "admin" } {
  return session.kind === "user" && session.role === "admin";
}

/** Same refusal the database function raises when the caller is not an admin. */
export function assertAdmin(session: Session): void {
  if (!isAdminSession(session)) throw new Error("not allowed");
}

export async function adminStats(session: Session, days = 30) {
  assertAdmin(session);
  const span = days === 7 || days === 90 ? days : 30;
  const users = await listUsers();
  const catalog = getBooks();
  return {
    books: catalog.length,
    registeredUsers: users.length,
    guestSessions: 0,
    downloads: 0,
    downloadsLast30Days: 0,
    booksByCategory: countByCategory(),
    mostDownloaded: [] as { title: string; count: number }[],
    recentDownloads: [] as { id: string; who: string; book: string; date: string }[],
    downloadsPerDay: lastDays(span),
    missingCovers: catalog.filter((book) => !book.coverUrl).length,
    missingLicenses: catalog.filter((book) => book.license.trim() === "").length,
    latestUsers: [...users].reverse().slice(0, 5).map((user) => ({
      id: user.email,
      name: user.name,
      email: user.email,
      role: user.role,
    })),
    adminCount: users.filter((user) => user.role === "admin").length,
  };
}

/** One zero for each day in the range. Downloads are not stored in the local files. */
function lastDays(count: number): { date: string; count: number }[] {
  const points: { date: string; count: number }[] = [];
  const now = new Date();
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    points.push({ date: day.toISOString().slice(0, 10), count: 0 });
  }
  return points;
}

export async function adminListUsers(
  session: Session,
  search: string,
  limit: number,
  offset: number,
  filters?: { role?: "user" | "admin"; type?: "registered" | "guest" },
) {
  assertAdmin(session);
  if (filters?.type === "guest") return { total: 0, rows: [] };
  const needle = search.trim().toLowerCase();
  const users = (await listUsers()).filter((user) => {
    if (filters?.role && user.role !== filters.role) return false;
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
      status: "Active",
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
