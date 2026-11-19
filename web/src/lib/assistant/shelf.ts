import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { EMPTY_SHELF, type ShelfState } from "./actions";

type SlugRow = { books: { slug: string } | { slug: string }[] | null };
type ItemRow = SlugRow & { collection_id: string; position: number };

const MAX_BOOKS = 60;
const MAX_COLLECTIONS = 20;

function slugOf(row: SlugRow): string | null {
  const book = Array.isArray(row.books) ? row.books[0] : row.books;
  return book?.slug ?? null;
}

/**
 * The caller's own shelf, read with their own client so row level security limits every query to
 * their rows. Capped so the prompt stays small. Any failure gives an empty shelf: the assistant
 * still answers, it just can't personalise.
 */
export async function loadShelf(supabase: SupabaseClient, userId: string): Promise<ShelfState> {
  try {
    const [library, favorites, collections] = await Promise.all([
      supabase
        .from("library_items")
        .select("created_at, books!inner(slug)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(MAX_BOOKS),
      supabase
        .from("favorites")
        .select("created_at, books!inner(slug)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(MAX_BOOKS),
      supabase
        .from("collections")
        .select("id, name")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(MAX_COLLECTIONS),
    ]);

    const groups = ((collections.data ?? []) as { id: string; name: string }[]).map((c) => ({ ...c, slugs: [] as string[] }));
    if (groups.length > 0) {
      const items = await supabase
        .from("collection_items")
        .select("collection_id, position, books!inner(slug)")
        .in("collection_id", groups.map((g) => g.id))
        .order("position", { ascending: true });
      for (const row of (items.data ?? []) as ItemRow[]) {
        const slug = slugOf(row);
        if (slug) groups.find((g) => g.id === row.collection_id)?.slugs.push(slug);
      }
    }

    const slugs = (rows: unknown) =>
      ((rows ?? []) as SlugRow[]).map(slugOf).filter((slug): slug is string => Boolean(slug));
    return { library: slugs(library.data), favorites: slugs(favorites.data), collections: groups };
  } catch {
    return EMPTY_SHELF;
  }
}
