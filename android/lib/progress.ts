import { supabase } from "@/lib/supabase";

export type ReadingProgress = {
  bookId: string;
  progress: number;
  updatedAt: string;
};

type ProgressRow = {
  progress: number;
  updated_at: string;
  books: { slug: string } | { slug: string }[] | null;
};

/** Saved reading positions for this account. */
export async function loadProgress(userId: string): Promise<ReadingProgress[]> {
  const { data, error } = await supabase.from("reading_progress").select("progress, updated_at, books!inner(slug)").eq("user_id", userId);
  if (error || !data) return [];
  return (data as ProgressRow[]).flatMap((row) => {
    const book = Array.isArray(row.books) ? row.books[0] : row.books;
    if (!book?.slug) return [];
    const progress = typeof row.progress === "number" ? row.progress : Number(row.progress);
    if (!Number.isFinite(progress)) return [];
    return [{ bookId: book.slug, progress: Math.min(1, Math.max(0, progress)), updatedAt: row.updated_at }];
  });
}

/** Sets progress to 1 or 0 and keeps the saved position. */
export async function setProgressMark(userId: string, slug: string, progress: number): Promise<boolean> {
  const book = await supabase.from("books").select("id").eq("slug", slug).maybeSingle();
  if (!book.data?.id) return false;
  const existing = await supabase.from("reading_progress").select("cfi").eq("user_id", userId).eq("book_id", book.data.id).maybeSingle();
  const { error } = await supabase.from("reading_progress").upsert(
    {
      user_id: userId,
      book_id: book.data.id,
      cfi: existing.data?.cfi || "library",
      progress,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,book_id" },
  );
  return !error;
}
