import "server-only";

import type { CollectionGroup, Membership } from "@/lib/collection";
import { createClient } from "@/lib/supabase/server";

type ItemRow = {
  collection_id: string;
  position: number;
  book_id?: string;
  books: { slug: string } | { slug: string }[] | null;
};

function slugOf(row: ItemRow): string | null {
  const book = Array.isArray(row.books) ? row.books[0] : row.books;
  return book?.slug ?? null;
}

/** This reader's collections, oldest first. Reading lists are included until the merge migration runs. */
export async function listCollections(userId: string): Promise<CollectionGroup[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, name")
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

  return data.map((row) => {
    const ordered = (books.get(row.id as string) ?? []).sort((a, b) => a.position - b.position);
    return { id: row.id as string, name: row.name as string, bookIds: ordered.map((item) => item.slug) };
  });
}

/** Creates a collection. A repeated name is refused. */
export async function createCollection(userId: string, name: string): Promise<{ id: string } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) return { error: "Enter a name up to 80 characters." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: userId, name: trimmed, kind: "collection" })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: `You already have a collection named ${trimmed}.` };
    return { error: "We couldn't create that. Try again." };
  }
  return { id: data.id as string };
}

export async function renameCollection(userId: string, collectionId: string, name: string): Promise<{ ok: true } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) return { error: "Enter a name up to 80 characters." };
  const supabase = await createClient();
  const { error } = await supabase.from("collections").update({ name: trimmed }).eq("id", collectionId).eq("user_id", userId);
  if (error) {
    if (error.code === "23505") return { error: `You already have a collection named ${trimmed}.` };
    return { error: "We couldn't rename that. Try again." };
  }
  return { ok: true };
}

/** Puts the book in the collection. The caller has already put it on the Library shelf. */
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

/** Drops these books from the one collection on screen. They stay on the Library shelf. */
export async function removeBooksFromCollection(userId: string, collectionId: string, slugs: string[]): Promise<boolean> {
  if (slugs.length === 0) return true;
  const supabase = await createClient();
  const owned = await supabase.from("collections").select("id").eq("id", collectionId).eq("user_id", userId).maybeSingle();
  if (!owned.data) return false;
  const books = await supabase.from("books").select("id").in("slug", slugs);
  const bookIds = (books.data ?? []).map((row) => row.id as string);
  if (bookIds.length === 0) return false;
  const { error } = await supabase.from("collection_items").delete().eq("collection_id", collectionId).in("book_id", bookIds);
  return !error;
}

/** Collection rows for these books, read before a Library removal so Undo can restore them. */
export async function membershipsFor(userId: string, slugs: string[]): Promise<Membership[]> {
  if (slugs.length === 0) return [];
  const supabase = await createClient();
  const books = await supabase.from("books").select("id, slug").in("slug", slugs);
  const slugById = new Map((books.data ?? []).map((row) => [row.id as string, row.slug as string]));
  const bookIds = [...slugById.keys()];
  if (bookIds.length === 0) return [];
  const owned = await supabase.from("collections").select("id").eq("user_id", userId);
  const allowed = new Set((owned.data ?? []).map((row) => row.id as string));
  const items = await supabase.from("collection_items").select("collection_id, book_id, position").in("book_id", bookIds);
  return ((items.data ?? []) as { collection_id: string; book_id: string; position: number }[]).flatMap((row) => {
    const bookId = slugById.get(row.book_id);
    if (!bookId || !allowed.has(row.collection_id)) return [];
    return [{ bookId, collectionId: row.collection_id, position: row.position }];
  });
}

/** Puts books back into the collections they left, at the same positions. */
export async function restoreMemberships(userId: string, items: Membership[]): Promise<boolean> {
  if (items.length === 0) return true;
  const supabase = await createClient();
  const owned = await supabase.from("collections").select("id").eq("user_id", userId);
  const allowed = new Set((owned.data ?? []).map((row) => row.id as string));
  const slugs = [...new Set(items.map((item) => item.bookId))];
  const books = await supabase.from("books").select("id, slug").in("slug", slugs);
  const idBySlug = new Map((books.data ?? []).map((row) => [row.slug as string, row.id as string]));
  const rows = items.flatMap((item) => {
    const bookId = idBySlug.get(item.bookId);
    if (!bookId || !allowed.has(item.collectionId)) return [];
    return [{ collection_id: item.collectionId, book_id: bookId, position: item.position }];
  });
  if (rows.length === 0) return true;
  const { error } = await supabase.from("collection_items").upsert(rows, { onConflict: "collection_id,book_id" });
  return !error;
}

/**
 * Makes the book's collections match `wanted`. A new name creates a collection and files the book there.
 * One book replaces memberships. Several books are only added, so one book's groups aren't cleared for the others.
 */
export async function saveCollectionChoices(
  userId: string,
  slugs: string[],
  wanted: string[],
  newName: string | undefined,
  replace: boolean,
): Promise<{ ok: true } | { error: string }> {
  const { setInLibrary } = await import("@/lib/records");
  for (const slug of slugs) {
    if (!(await setInLibrary(userId, slug, true))) return { error: "That book isn't in the catalog." };
  }
  const ids = [...wanted];
  const name = newName?.trim();
  if (name) {
    const created = await createCollection(userId, name);
    if ("error" in created) return { error: created.error };
    ids.push(created.id);
  }
  if (replace && slugs.length === 1) {
    const current = await membershipsFor(userId, slugs);
    const want = new Set(ids);
    for (const row of current) {
      if (!want.has(row.collectionId)) await removeBooksFromCollection(userId, row.collectionId, slugs);
    }
  }
  for (const slug of slugs) {
    const current = new Set((await membershipsFor(userId, [slug])).map((row) => row.collectionId));
    for (const id of ids) {
      if (current.has(id)) continue;
      if (!(await addBookToCollection(userId, id, slug))) return { error: "The book is in your Library, but it couldn't be filed." };
    }
  }
  return { ok: true };
}

export async function deleteCollection(userId: string, collectionId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("collections").delete().eq("id", collectionId).eq("user_id", userId);
  return !error;
}
