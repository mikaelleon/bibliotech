import "server-only";

import { listCatalog } from "@/lib/catalog";
import { countByCategory } from "@/lib/records";
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
 * One page of accounts, through admin_list_users (security definer, checks is_admin() itself).
 * Search, role, type and paging all run in SQL, so the browser never receives more than one page.
 */
async function usersPage(
  search: string,
  limit: number,
  offset: number,
  filters?: { role?: "user" | "admin"; type?: "registered" | "guest" },
): Promise<UserListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", {
    search: search.trim() || null,
    lim: limit,
    off: offset,
    p_role: filters?.role ?? null,
    p_type: filters?.type ?? null,
  });
  if (error) throw new Error(`Could not load users: ${error.message}`);
  return (data ?? []) as UserListRow[];
}

/** "d***@gmail.com". Activity feeds on the dashboard never show a full address. */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return domain ? `${local.slice(0, 1)}***@${domain}` : `${local.slice(0, 1)}***`;
}

function nameOf(row: UserListRow): string {
  return row.display_name || row.email.split("@")[0] || "Reader";
}

type StatsRow = {
  registeredUsers: number;
  guestUsers: number;
  downloads: number;
  downloadEvents: number;
  repeatDownloads: number;
  downloadsLast30Days: number;
  downloadsInRange: number;
  mostDownloaded: { id: string; title: string; count: number }[];
  recentDownloads: { who: string; book: string; at: string }[];
  downloadsPerDay: { date: string; count: number }[];
};

export async function adminStats(session: Session, days = 30) {
  assertAdmin(session);
  const span = days === 7 || days === 90 ? days : 30;
  const supabase = await createClient();
  const [{ data, error }, latest] = await Promise.all([supabase.rpc("admin_stats", { p_days: span }), usersPage("", 5, 0)]);
  if (error) throw new Error(`Could not load stats: ${error.message}`);
  const stats = data as StatsRow;
  const catalog = await listCatalog();
  const perDay = new Map((stats.downloadsPerDay ?? []).map((point) => [point.date, point.count]));

  return {
    books: catalog.length,
    registeredUsers: stats.registeredUsers ?? 0,
    guestUsers: stats.guestUsers ?? 0,
    /** One per reader and book. */
    downloads: stats.downloads ?? 0,
    /** Every save, repeats included. */
    downloadEvents: stats.downloadEvents ?? stats.downloads ?? 0,
    repeatDownloads: stats.repeatDownloads ?? 0,
    downloadsLast30Days: stats.downloadsLast30Days ?? 0,
    downloadsInRange: stats.downloadsInRange ?? 0,
    booksByCategory: await countByCategory(),
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
    latestUsers: latest.map((user) => ({
      id: user.id,
      name: nameOf(user),
      email: maskEmail(user.email),
      role: user.role,
    })),
  };
}

/** One point for each day in the range, oldest first. admin_stats returns the same span. */
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
  const users = await usersPage(search, limit, offset, filters);
  return {
    total: Number(users[0]?.total_count ?? 0),
    rows: users.map((user) => ({
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

type UserDetailRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  email_verified_at: string | null;
  tier: UserListRow["tier"];
  downloads_used: number;
  download_limit: number;
  resets_at: string | null;
  favorites: number;
  library_items: number;
  admin_count: number;
};

/**
 * One account with shelf counts, for the admin user page. admin_get_user returns counts only,
 * never what is on the shelves, and writes an audit row for the view.
 */
export async function adminGetUser(session: Session, id: string) {
  assertAdmin(session);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_get_user", { p_user: id });
  if (error) throw new Error(`Could not load user: ${error.message}`);
  const user = data as UserDetailRow | null;
  if (!user) return null;
  return {
    id: user.id,
    name: user.display_name || user.email.split("@")[0] || "Reader",
    email: user.email,
    role: user.role === "admin" ? ("admin" as const) : ("user" as const),
    tier: tierLabel(user.tier),
    verifiedAt: user.email_verified_at,
    downloadsUsed: user.downloads_used,
    downloadLimit: user.download_limit,
    resetsAt: user.resets_at,
    favorites: Number(user.favorites),
    libraryItems: Number(user.library_items),
    adminCount: Number(user.admin_count),
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

type AuditRow = {
  created_at: string;
  admin_label: string;
  action: string;
  target_label: string | null;
  total_count: number;
};

const actionLabels: Record<string, string> = {
  view_user: "Viewed account",
  set_role: "Changed role",
  create_book: "Added book",
  update_book: "Edited book",
  delete_book: "Deleted book",
};

/** What admins looked at or changed. Identities are masked in SQL. */
export async function adminListAudit(session: Session, limit: number, offset: number) {
  assertAdmin(session);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_audit", { lim: limit, off: offset });
  if (error) throw new Error(`Could not load activity: ${error.message}`);
  const list = (data ?? []) as AuditRow[];
  return {
    total: Number(list[0]?.total_count ?? 0),
    rows: list.map((row, index) => ({
      id: `${row.created_at}-${offset + index}`,
      at: row.created_at,
      admin: row.admin_label,
      action: actionLabels[row.action] ?? row.action,
      target: row.target_label ?? "",
    })),
  };
}
