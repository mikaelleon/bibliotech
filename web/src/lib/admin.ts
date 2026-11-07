import "server-only";

import { getBooks } from "@/lib/books";
import { countByCategory, listFavoriteIds, listLibrary } from "@/lib/records";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Session } from "@/lib/types";

export function isAdminSession(
  session: Session,
): session is Extract<Session, { kind: "user" }> & { role: "admin" } {
  return session.kind === "user" && session.role === "admin";
}

/** Same refusal the database functions raise when the caller is not an admin. */
export function assertAdmin(session: Session): void {
  if (!isAdminSession(session)) throw new Error("not allowed");
}

type UserListRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
  email_verified_at: string | null;
  tier: "admin" | "registered" | "guest";
  downloads_used: number;
  download_limit: number;
  resets_at: string | null;
  total_count: number;
};

/** "Registered", "Guest (unverified)" or "Administrator". */
function tierLabel(tier: UserListRow["tier"]): string {
  if (tier === "admin") return "Administrator";
  return tier === "registered" ? "Registered" : "Guest (unverified)";
}

function joinedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Every account, through admin_list_users (security definer, checks is_admin() itself).
 * Called as the signed-in admin, so the database refuses anyone else even if this check is skipped.
 * Small catalogue of users for now; Phase 2 step 8 moves filters and paging into SQL.
 */
async function allUsers(): Promise<UserListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", { search: null, lim: 1000, off: 0 });
  if (error) throw new Error(`Could not load users: ${error.message}`);
  return (data ?? []) as UserListRow[];
}

function nameOf(row: UserListRow): string {
  return row.display_name || row.email.split("@")[0] || "Reader";
}

type StatsRow = {
  registeredUsers: number;
  guestUsers: number;
  downloads: number;
  repeatDownloads: number;
  downloadsLast30Days: number;
  mostDownloaded: { title: string; count: number }[];
  recentDownloads: { who: string; book: string; at: string }[];
  downloadsPerDay: { date: string; count: number }[];
};

export async function adminStats(session: Session, days = 30) {
  assertAdmin(session);
  const span = days === 7 || days === 90 ? days : 30;
  const supabase = await createClient();
  const [{ data, error }, users] = await Promise.all([supabase.rpc("admin_stats"), allUsers()]);
  if (error) throw new Error(`Could not load stats: ${error.message}`);
  const stats = data as StatsRow;
  const catalog = getBooks();
  const perDay = new Map((stats.downloadsPerDay ?? []).map((point) => [point.date, point.count]));

  return {
    books: catalog.length,
    registeredUsers: stats.registeredUsers ?? users.length,
    guestUsers: stats.guestUsers ?? 0,
    downloads: stats.downloads ?? 0,
    repeatDownloads: stats.repeatDownloads ?? 0,
    downloadsLast30Days: stats.downloadsLast30Days ?? 0,
    booksByCategory: countByCategory(),
    mostDownloaded: stats.mostDownloaded ?? [],
    recentDownloads: (stats.recentDownloads ?? []).map((row, index) => ({
      id: `${row.at}-${index}`,
      who: row.who,
      book: row.book,
      date: row.at,
    })),
    downloadsPerDay: lastDays(span).map((point) => ({ ...point, count: perDay.get(point.date) ?? 0 })),
    missingCovers: catalog.filter((book) => !book.coverUrl).length,
    missingLicenses: catalog.filter((book) => book.license.trim() === "").length,
    latestUsers: users.slice(0, 5).map((user) => ({
      id: user.id,
      name: nameOf(user),
      email: user.email,
      role: user.role,
    })),
    adminCount: users.filter((user) => user.role === "admin").length,
  };
}

/** One point for each day in the range, oldest first. admin_stats covers the last 30 days. */
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
  const needle = search.trim().toLowerCase();
  const users = (await allUsers()).filter((user) => {
    if (filters?.role && user.role !== filters.role) return false;
    // Type follows the tier model: Registered = verified email, Guest = signed up, not verified.
    if (filters?.type && user.tier !== filters.type) return false;
    if (!needle) return true;
    return nameOf(user).toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle);
  });
  return {
    total: users.length,
    rows: users.slice(offset, offset + limit).map((user) => ({
      id: user.id,
      email: user.email,
      name: nameOf(user),
      role: user.role,
      tier: tierLabel(user.tier),
      joined: joinedLabel(user.created_at),
      downloadsUsed: user.downloads_used,
      downloadLimit: user.download_limit,
      status: "Active",
    })),
  };
}

/** One account with its shelf counts, for the admin user page. */
export async function adminGetUser(session: Session, id: string) {
  assertAdmin(session);
  const users = await allUsers();
  const user = users.find((item) => item.id === id);
  if (!user) return null;
  // RLS limits shelves to their owner, so reading another user's rows needs the secret key.
  // Safe here: assertAdmin above, and admin_list_users already confirmed is_admin() in SQL.
  const admin = createAdminClient();
  const [favorites, library] = await Promise.all([listFavoriteIds(user.id, admin), listLibrary(user.id, "added", admin)]);
  return {
    id: user.id,
    name: nameOf(user),
    email: user.email,
    role: user.role === "admin" ? ("admin" as const) : ("user" as const),
    tier: tierLabel(user.tier),
    verifiedAt: user.email_verified_at,
    downloadsUsed: user.downloads_used,
    downloadLimit: user.download_limit,
    resetsAt: user.resets_at,
    favorites: favorites.length,
    libraryItems: library.length,
    adminCount: users.filter((item) => item.role === "admin").length,
  };
}

type DownloadListRow = {
  who_label: string;
  book_title: string;
  first_downloaded_at: string;
  last_downloaded_at: string;
  times_downloaded: number;
  total_count: number;
};

export async function adminListDownloads(session: Session, limit: number, offset: number) {
  assertAdmin(session);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_downloads", { lim: limit, off: offset });
  if (error) throw new Error(`Could not load downloads: ${error.message}`);
  const list = (data ?? []) as DownloadListRow[];
  return {
    total: Number(list[0]?.total_count ?? 0),
    rows: list.map((row, index) => ({
      id: `${row.last_downloaded_at}-${offset + index}`,
      who: row.who_label,
      book: row.book_title,
      date: row.last_downloaded_at,
      times: row.times_downloaded,
    })),
  };
}
