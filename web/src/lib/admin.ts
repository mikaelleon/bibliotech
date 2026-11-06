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
  };
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
