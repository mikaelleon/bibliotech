import { dropQueuedReading, queuedReading, queuedReadings, queueReading } from "@/lib/local-books";
import { supabase } from "@/lib/supabase";

const api = process.env.EXPO_PUBLIC_API_URL;

export type DownloadResponse = {
  url?: string;
  used?: number | null;
  limit?: number | null;
  error?: { code?: string; message?: string; lastDownloadedAt?: string; resetsAt?: string };
};

export async function requestDownload(bookId: string, confirmRepeat: boolean): Promise<{ status: number; body: DownloadResponse }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!api || !token) return { status: 401, body: { error: { code: "UNAUTHENTICATED", message: "Log in to download a book." } } };
  const response = await fetch(`${api}/api/books/${bookId}/download`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ deviceLabel: "Android", confirmRepeat }),
  });
  const body = (await response.json()) as DownloadResponse;
  return { status: response.status, body };
}

export async function readingPosition(userId: string, bookId: string): Promise<string | null> {
  const queued = queuedReading(userId, bookId);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!api || !token) return queued?.cfi ?? null;
  try {
    const response = await fetch(`${api}/api/books/${bookId}/progress`, { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) return queued?.cfi ?? null;
    const body = (await response.json()) as { cfi?: string | null };
    return body.cfi ?? queued?.cfi ?? null;
  } catch {
    return queued?.cfi ?? null;
  }
}

export async function saveReadingPosition(userId: string, bookId: string, cfi: string, progress: number): Promise<void> {
  const updatedAt = new Date().toISOString();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!api || !token) {
    queueReading(userId, bookId, cfi, progress, updatedAt);
    return;
  }
  try {
    const response = await fetch(`${api}/api/books/${bookId}/progress`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ cfi, progress, updatedAt }),
    });
    if (!response.ok) queueReading(userId, bookId, cfi, progress, updatedAt);
    else dropQueuedReading(userId, bookId);
  } catch {
    queueReading(userId, bookId, cfi, progress, updatedAt);
  }
}

export async function flushReading(userId: string): Promise<void> {
  for (const entry of queuedReadings(userId)) {
    await saveReadingPosition(userId, entry.bookId, entry.cfi, entry.progress);
  }
}

export type HistoryItem = {
  id: string;
  title: string;
  author: string;
  category: string;
  firstDownloadedAt: string;
  lastDownloadedAt?: string;
  times: number;
  device?: string | null;
  devices: string[];
};

type HistoryBook = { slug: string; title: string; author: string; category: string | null };

function historyItems(rows: Record<string, unknown>[]): HistoryItem[] {
  return rows.flatMap((row) => {
    const book = (Array.isArray(row.books) ? row.books[0] : row.books) as HistoryBook | null;
    if (!book?.slug) return [];
    const devices = Array.isArray(row.devices) ? row.devices.filter((item): item is string => typeof item === "string") : [];
    const device = typeof row.last_device_label === "string" ? row.last_device_label : null;
    return [{
      id: book.slug,
      title: book.title,
      author: book.author,
      category: book.category ?? "Fiction",
      firstDownloadedAt: String(row.first_downloaded_at ?? ""),
      lastDownloadedAt: typeof row.last_downloaded_at === "string" ? row.last_downloaded_at : undefined,
      times: Number(row.times_downloaded ?? 1),
      device,
      devices: devices.length > 0 ? devices : device ? [device] : [],
    }];
  });
}

export async function downloadHistory(): Promise<HistoryItem[]> {
  const withDevices = await supabase
    .from("downloads")
    .select("first_downloaded_at, last_downloaded_at, times_downloaded, last_device_label, devices, books(slug, title, author, category)")
    .order("last_downloaded_at", { ascending: false });
  const result = withDevices.error?.message?.includes("devices")
    ? await supabase
        .from("downloads")
        .select("first_downloaded_at, last_downloaded_at, times_downloaded, last_device_label, books(slug, title, author, category)")
        .order("last_downloaded_at", { ascending: false })
    : withDevices;
  if (result.error) throw new Error(result.error.message);
  return historyItems((result.data ?? []) as Record<string, unknown>[]);
}
