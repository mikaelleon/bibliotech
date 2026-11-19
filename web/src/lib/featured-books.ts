import "server-only";

import { listCatalog } from "@/lib/catalog";
import { engagementScore, rankFeatured, type Engagement } from "@/lib/featured";
import type { Book } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type EngagementRow = {
  slug: string;
  downloads: number | string | null;
  favorites: number | string | null;
  library_adds: number | string | null;
};

function count(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function rowsToScores(rows: EngagementRow[]): Map<string, Engagement> {
  const scores = new Map<string, Engagement>();
  for (const row of rows) {
    if (!row.slug) continue;
    const engagement = {
      downloads: count(row.downloads),
      favorites: count(row.favorites),
      libraryAdds: count(row.library_adds),
    };
    if (engagementScore(engagement) > 0) scores.set(row.slug, engagement);
  }
  return scores;
}

/** Counts from `book_engagement()`. Null when the function is not installed yet. */
async function scoresFromDatabase(): Promise<Map<string, Engagement> | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("book_engagement");
    if (error) return null;
    return rowsToScores((data ?? []) as EngagementRow[]);
  } catch {
    return null;
  }
}

async function everyPage<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[] | null> {
  const size = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await fetchPage(from, from + size - 1);
    if (error) return null;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < size) return rows;
  }
}

/**
 * Same counts as `book_engagement()`, read with the secret key when the function
 * is not available yet. Aggregates only; the shelf never sees who did what.
 */
async function scoresFromAdmin(): Promise<Map<string, Engagement>> {
  try {
    const admin = createAdminClient();
    const [books, downloads, favorites, library] = await Promise.all([
      everyPage<{ id: string; slug: string }>((from, to) =>
        admin.from("books").select("id, slug").range(from, to),
      ),
      everyPage<{ book_id: string; times_downloaded: number | null }>((from, to) =>
        admin.from("downloads").select("book_id, times_downloaded").range(from, to),
      ),
      everyPage<{ book_id: string }>((from, to) => admin.from("favorites").select("book_id").range(from, to)),
      everyPage<{ book_id: string }>((from, to) => admin.from("library_items").select("book_id").range(from, to)),
    ]);
    if (!books || !downloads || !favorites || !library) return new Map();

    const slugOf = new Map(books.map((row) => [row.id, row.slug]));
    const scores = new Map<string, Engagement>();
    const bump = (bookId: string, key: keyof Engagement, amount: number) => {
      const slug = slugOf.get(bookId);
      if (!slug || amount <= 0) return;
      const current = scores.get(slug) ?? { downloads: 0, favorites: 0, libraryAdds: 0 };
      current[key] += amount;
      scores.set(slug, current);
    };
    for (const row of downloads) bump(row.book_id, "downloads", row.times_downloaded ?? 0);
    for (const row of favorites) bump(row.book_id, "favorites", 1);
    for (const row of library) bump(row.book_id, "libraryAdds", 1);
    return scores;
  } catch {
    return new Map();
  }
}

/** Download, favorite, and library counts per slug. Empty when nobody has used a book yet. */
export async function featuredEngagement(): Promise<Map<string, Engagement>> {
  const fromDatabase = await scoresFromDatabase();
  return fromDatabase ?? scoresFromAdmin();
}

/** Books for the Featured shelf, most used first, known literature when nothing has been used yet. */
export async function listFeaturedBooks(): Promise<Book[]> {
  const [catalog, scores] = await Promise.all([listCatalog(), featuredEngagement()]);
  return rankFeatured(catalog, scores);
}
