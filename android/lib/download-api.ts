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

export async function downloadHistory(): Promise<{ id: string; title: string; author: string; firstDownloadedAt: string; times: number }[]> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!api || !token) return [];
  const response = await fetch(`${api}/api/downloads`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) return [];
  const body = (await response.json()) as { downloads: { id: string; title: string; author: string; firstDownloadedAt: string; times: number }[] };
  return body.downloads;
}
