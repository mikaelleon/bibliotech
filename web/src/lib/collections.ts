import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CollectionGroup, CollectionKind } from "@/lib/collection";

type ItemRow = {
  collection_id: string;
  position: number;
  books: { slug: string } | { slug: string }[] | null;
};

function slugOf(row: ItemRow): string | null {
  const book = Array.isArray(row.books) ? row.books[0] : row.books;
  return book?.slug ?? null;
}

/** The signed-in reader's lists and collections, oldest first, books in list order. */
export async function listCollections(userId: string): Promise<CollectionGroup[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, kind")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];

  const ids = data.map((row) => row.id as string);
  const books = new Map<string, { slug: string; position: number }[]>();
  if (ids.length > 0) {
    const items = await supabase
      .from("collection_items")
      .select("collection_id, position, books!inner(slug)")
      .in("collection_id", ids)
      .order("position", { ascending: true });
    for (const row of (items.data ?? []) as ItemRow[]) {
      const slug = slugOf(row);
      if (!slug) continue;
      const list = books.get(row.collection_id) ?? [];
      list.push({ slug, position: row.position });
      books.set(row.collection_id, list);
    }
  }

  return data.flatMap((row) => {
    const kind = row.kind === "reading_list" ? "reading_list" : row.kind === "collection" ? "collection" : null;
    if (!kind) return [];
    const ordered = (books.get(row.id as string) ?? []).sort((a, b) => a.position - b.position);
    return [{ id: row.id as string, name: row.name as string, kind, bookIds: ordered.map((item) => item.slug) }];
  });
}

/** Creates a group owned by this reader. A repeated name for the same kind is refused. */
export async function createCollection(userId: string, name: string, kind: CollectionKind): Promise<{ id: string } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) return { error: "Enter a name up to 80 characters." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: userId, name: trimmed, kind })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: `You already have a ${kind === "reading_list" ? "reading list" : "collection"} named ${trimmed}.` };
    return { error: "We couldn't create that. Try again." };
  }
  return { id: data.id as string };
}

/** Puts the book in the group. The caller has already put it on the Library shelf. */
export async function addBookToCollection(userId: string, collectionId: string, slug: string): Promise<boolean> {
  const supabase = await createClient();
  const owned = await supabase.from("collections").select("id").eq("id", collectionId).eq("user_id", userId).maybeSingle();
  if (!owned.data) return false;
  const book = await supabase.from("books").select("id").eq("slug", slug).maybeSingle();
  if (!book.data?.id) return false;
  const last = await supabase
    .from("collection_items")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1);
  const position = ((last.data?.[0]?.position as number | undefined) ?? -1) + 1;
  const { error } = await supabase
    .from("collection_items")
    .upsert({ collection_id: collectionId, book_id: book.data.id, position }, { onConflict: "collection_id,book_id", ignoreDuplicates: true });
  return !error;
}

/** Drops the book from every group of this kind. It stays on the Library shelf. */
export async function removeBooksFromKind(userId: string, slugs: string[], kind: CollectionKind): Promise<boolean> {
  const supabase = await createClient();
  const groups = await supabase.from("collections").select("id").eq("user_id", userId).eq("kind", kind);
  const groupIds = (groups.data ?? []).map((row) => row.id as string);
  if (groupIds.length === 0 || slugs.length === 0) return true;
  const books = await supabase.from("books").select("id").in("slug", slugs);
  const bookIds = (books.data ?? []).map((row) => row.id as string);
  if (bookIds.length === 0) return false;
  const { error } = await supabase.from("collection_items").delete().in("collection_id", groupIds).in("book_id", bookIds);
  return !error;
}

export async function deleteCollection(userId: string, collectionId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("collections").delete().eq("id", collectionId).eq("user_id", userId);
  return !error;
}
