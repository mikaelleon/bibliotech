import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getBooks, type Book } from "@/lib/books";
import { createClient } from "@/lib/supabase/server";

/**
 * Library shelf (`library_items`) and favorites, stored in Supabase.
 * Rows point at `books.id`; the app addresses books by `books.slug`, so every read joins it.
 * The default client acts as the signed-in user, and RLS limits it to that user's rows.
 * Admin screens pass the secret-key client after checking the caller is an admin.
 */

type Client = SupabaseClient;
type SlugRow = { created_at: string; books: { slug: string } | { slug: string }[] | null };

async function clientOr(client?: Client): Promise<Client> {
  return client ?? (await createClient());
}

function slugOf(row: SlugRow): string | null {
  const book = Array.isArray(row.books) ? row.books[0] : row.books;
  return book?.slug ?? null;
}

async function booksFor(ids: string[]): Promise<Book[]> {
  const { listCatalog } = await import("@/lib/catalog");
  const catalog = await listCatalog();
  const byId = new Map(catalog.map((book) => [book.id, book]));
  return ids.flatMap((id) => {
    const book = byId.get(id) ?? getBooks().find((item) => item.id === id);
    return book ? [book] : [];
  });
}

async function bookIdForSlug(supabase: Client, slug: string): Promise<string | null> {
  const { data } = await supabase.from("books").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

async function rows(table: "favorites" | "library_items", userId: string, client?: Client): Promise<SlugRow[]> {
  const supabase = await clientOr(client);
  const { data, error } = await supabase
    .from(table)
    .select("created_at, books!inner(slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: table === "favorites" });
  if (error) throw new Error(`Could not load ${table}: ${error.message}`);
  return (data ?? []) as SlugRow[];
}

export async function listFavoriteIds(userId: string, client?: Client): Promise<string[]> {
  return (await rows("favorites", userId, client)).map(slugOf).filter((slug): slug is string => Boolean(slug));
}

export async function listFavorites(userId: string): Promise<Book[]> {
  return booksFor(await listFavoriteIds(userId));
}

/**
 * Sets the favorite to exactly `on`; false when the book is unknown. Idempotent, so a double tap or a stale button can't flip
 * the state the wrong way. `at` puts an Undo back at its old position: favorites sort by
 * `created_at`, so the restored row gets a time between its new neighbours.
 */
export async function setFavorite(userId: string, slug: string, on: boolean, at?: number): Promise<boolean> {
  const supabase = await createClient();
  const bookId = await bookIdForSlug(supabase, slug);
  if (!bookId) return false;
  if (on) {
    const createdAt = at === undefined ? undefined : await timeForPosition(userId, at);
    const row = { user_id: userId, book_id: bookId, ...(createdAt ? { created_at: createdAt } : {}) };
    const { error } = await supabase.from("favorites").upsert(row, { onConflict: "user_id,book_id", ignoreDuplicates: true });
    if (error) throw new Error(`Could not save the favorite: ${error.message}`);
  } else {
    const { error } = await supabase.from("favorites").delete().eq("user_id", userId).eq("book_id", bookId);
    if (error) throw new Error(`Could not remove the favorite: ${error.message}`);
  }
  return true;
}

/** A created_at that sorts at index `at` among the user's current favorites. */
async function timeForPosition(userId: string, at: number): Promise<string | undefined> {
  const list = await rows("favorites", userId);
  if (at >= list.length) return undefined;
  const after = Date.parse(list[at].created_at);
  const before = at > 0 ? Date.parse(list[at - 1].created_at) : after - 2;
  return new Date(Math.floor((before + after) / 2)).toISOString();
}

export async function listLibraryIds(userId: string): Promise<string[]> {
  return (await rows("library_items", userId)).map(slugOf).filter((slug): slug is string => Boolean(slug));
}

/**
 * Puts the book on, or takes it off, the user's Library shelf; false when the book is unknown. Idempotent. Adding never uses a
 * download: Library is a shelf, and `downloads` is a separate record (see docs/database.md).
 * `addedAt` keeps the original date when Undo puts a book back, so "Recently added" stays true.
 */
export async function setInLibrary(userId: string, slug: string, on: boolean, addedAt?: string): Promise<boolean> {
  const supabase = await createClient();
  const bookId = await bookIdForSlug(supabase, slug);
  if (!bookId) return false;
  if (on) {
    const row = { user_id: userId, book_id: bookId, ...(addedAt ? { created_at: addedAt } : {}) };
    const { error } = await supabase
      .from("library_items")
      .upsert(row, { onConflict: "user_id,book_id", ignoreDuplicates: true });
    if (error) throw new Error(`Could not add to Library: ${error.message}`);
  } else {
    const { error } = await supabase.from("library_items").delete().eq("user_id", userId).eq("book_id", bookId);
    if (error) throw new Error(`Could not remove from Library: ${error.message}`);
  }
  return true;
}

function addedAtMap(list: SlugRow[]): Record<string, string> {
  const entries = list
    .map((row) => [slugOf(row), row.created_at] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[0]));
  return Object.fromEntries(entries);
}

/** When each book was added, for Undo. */
export async function libraryAddedAt(userId: string): Promise<Record<string, string>> {
  return addedAtMap(await rows("library_items", userId));
}

export type LibrarySort = "added" | "title" | "author";

export async function listLibrary(userId: string, sort: LibrarySort = "added", client?: Client): Promise<Book[]> {
  const books = await booksFor((await rows("library_items", userId, client)).map(slugOf).filter((slug): slug is string => Boolean(slug)));
  if (sort === "title") books.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "author") books.sort((a, b) => a.author.localeCompare(b.author));
  return books;
}

export async function countByCategory(): Promise<{ label: string; count: number }[]> {
  const { listCatalog } = await import("@/lib/catalog");
  const books = await listCatalog();
  const labels = [...new Set(books.map((book) => book.category))];
  return labels.map((label) => ({
    label,
    count: books.filter((book) => book.category === label).length,
  }));
}
