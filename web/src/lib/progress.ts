import "server-only";

import type { ReadingProgress } from "@/lib/collection";
import { createClient } from "@/lib/supabase/server";

type ProgressRow = {
  progress: number;
  updated_at: string;
  books: { slug: string } | { slug: string }[] | null;
};

function slugOf(row: ProgressRow): string | null {
  const book = Array.isArray(row.books) ? row.books[0] : row.books;
  return book?.slug ?? null;
}

/** Saved reading positions for this account, addressed by book slug. */
export async function listProgress(userId: string): Promise<ReadingProgress[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reading_progress")
    .select("progress, updated_at, books!inner(slug)")
    .eq("user_id", userId);
  if (error || !data) return [];
  return (data as ProgressRow[]).flatMap((row) => {
    const bookId = slugOf(row);
    if (!bookId) return [];
    const progress = typeof row.progress === "number" ? row.progress : Number(row.progress);
    if (!Number.isFinite(progress)) return [];
    return [{ bookId, progress: Math.min(1, Math.max(0, progress)), updatedAt: row.updated_at }];
  });
}

/** Sets progress to 1 (finished) or 0 (unread) and keeps the saved position. */
export async function setProgressMark(userId: string, slug: string, progress: number): Promise<boolean> {
  const supabase = await createClient();
  const book = await supabase.from("books").select("id").eq("slug", slug).maybeSingle();
  if (!book.data?.id) return false;
  const existing = await supabase
    .from("reading_progress")
    .select("cfi")
    .eq("user_id", userId)
    .eq("book_id", book.data.id)
    .maybeSingle();
  const cfi = existing.data?.cfi || "library";
  const { error } = await supabase.from("reading_progress").upsert(
    {
      user_id: userId,
      book_id: book.data.id,
      cfi,
      progress: Math.min(1, Math.max(0, progress)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,book_id" },
  );
  return !error;
}
