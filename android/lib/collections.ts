import { supabase } from "@/lib/supabase";

export type CollectionGroup = {
  id: string;
  name: string;
  bookIds: string[];
};

export type Membership = {
  bookId: string;
  collectionId: string;
  position: number;
};

type ItemRow = {
  collection_id: string;
  position: number;
  books: { slug: string } | { slug: string }[] | null;
};

function slugOf(row: ItemRow): string | null {
  const book = Array.isArray(row.books) ? row.books[0] : row.books;
  return book?.slug ?? null;
}

/** This account's collections, oldest first. */
export async function loadCollections(userId: string): Promise<CollectionGroup[]> {
  const { data, error } = await supabase.from("collections").select("id, name").eq("user_id", userId).order("created_at", { ascending: true });
  if (error || !data) return [];
  const ids = data.map((row) => row.id as string);
  const books = new Map<string, { slug: string; position: number }[]>();
  if (ids.length > 0) {
    const items = await supabase.from("collection_items").select("collection_id, position, books!inner(slug)").in("collection_id", ids);
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

export async function createGroup(userId: string, name: string): Promise<{ id: string; name: string } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) return { error: "Enter a name up to 80 characters." };
  const { data, error } = await supabase.from("collections").insert({ user_id: userId, name: trimmed, kind: "collection" }).select("id").single();
  if (error) {
    if (error.code === "23505") return { error: `You already have a collection named ${trimmed}.` };
    return { error: "We couldn't create that. Try again." };
  }
  return { id: data.id as string, name: trimmed };
}

export async function renameGroup(userId: string, collectionId: string, name: string): Promise<{ ok: true } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) return { error: "Enter a name up to 80 characters." };
  const { error } = await supabase.from("collections").update({ name: trimmed }).eq("id", collectionId).eq("user_id", userId);
  if (error) {
    if (error.code === "23505") return { error: `You already have a collection named ${trimmed}.` };
    return { error: "We couldn't rename that. Try again." };
  }
  return { ok: true };
}

export async function deleteGroup(userId: string, collectionId: string): Promise<boolean> {
  const { error } = await supabase.from("collections").delete().eq("id", collectionId).eq("user_id", userId);
  return !error;
}

export async function addBookToGroup(userId: string, collectionId: string, slug: string): Promise<boolean> {
  const owned = await supabase.from("collections").select("id").eq("id", collectionId).eq("user_id", userId).maybeSingle();
  if (!owned.data) return false;
  const book = await supabase.from("books").select("id").eq("slug", slug).maybeSingle();
  if (!book.data?.id) return false;
  const last = await supabase.from("collection_items").select("position").eq("collection_id", collectionId).order("position", { ascending: false }).limit(1);
  const position = ((last.data?.[0]?.position as number | undefined) ?? -1) + 1;
  const { error } = await supabase.from("collection_items").upsert(
    { collection_id: collectionId, book_id: book.data.id, position },
    { onConflict: "collection_id,book_id", ignoreDuplicates: true },
  );
  return !error;
}

export async function removeBooksFromCollection(userId: string, collectionId: string, slugs: string[]): Promise<boolean> {
  if (slugs.length === 0) return true;
  const owned = await supabase.from("collections").select("id").eq("id", collectionId).eq("user_id", userId).maybeSingle();
  if (!owned.data) return false;
  const books = await supabase.from("books").select("id").in("slug", slugs);
  const bookIds = (books.data ?? []).map((row) => row.id as string);
  if (bookIds.length === 0) return false;
  const { error } = await supabase.from("collection_items").delete().eq("collection_id", collectionId).in("book_id", bookIds);
  return !error;
}

export async function listMemberships(slugs: string[]): Promise<Membership[]> {
  if (slugs.length === 0) return [];
  const books = await supabase.from("books").select("id, slug").in("slug", slugs);
  const slugById = new Map((books.data ?? []).map((row) => [row.id as string, row.slug as string]));
  const ids = [...slugById.keys()];
  if (ids.length === 0) return [];
  const items = await supabase.from("collection_items").select("collection_id, book_id, position").in("book_id", ids);
  return ((items.data ?? []) as { collection_id: string; book_id: string; position: number }[]).flatMap((row) => {
    const bookId = slugById.get(row.book_id);
    if (!bookId) return [];
    return [{ bookId, collectionId: row.collection_id, position: row.position }];
  });
}

export async function restoreMemberships(items: Membership[]): Promise<boolean> {
  if (items.length === 0) return true;
  const slugs = [...new Set(items.map((item) => item.bookId))];
  const books = await supabase.from("books").select("id, slug").in("slug", slugs);
  const idBySlug = new Map((books.data ?? []).map((row) => [row.slug as string, row.id as string]));
  const rows = items.flatMap((item) => {
    const bookId = idBySlug.get(item.bookId);
    if (!bookId) return [];
    return [{ collection_id: item.collectionId, book_id: bookId, position: item.position }];
  });
  if (rows.length === 0) return true;
  const { error } = await supabase.from("collection_items").upsert(rows, { onConflict: "collection_id,book_id" });
  return !error;
}

/** Leaving the shelf drops the book from every collection. Callers snapshot memberships first. */
export async function removeBookFromGroups(slug: string): Promise<void> {
  const book = await supabase.from("books").select("id").eq("slug", slug).maybeSingle();
  if (!book.data?.id) return;
  await supabase.from("collection_items").delete().eq("book_id", book.data.id);
}

export async function saveCollectionChoices(slugs: string[], wanted: string[], newName: string, userId: string, replace: boolean): Promise<{ ok: true } | { error: string }> {
  const ids = [...wanted];
  const name = newName.trim();
  if (name) {
    const created = await createGroup(userId, name);
    if ("error" in created) return created;
    ids.push(created.id);
  }
  for (const slug of slugs) {
    const current = await listMemberships([slug]);
    if (replace && slugs.length === 1) {
      for (const row of current) {
        if (!ids.includes(row.collectionId)) await removeBooksFromCollection(userId, row.collectionId, [slug]);
      }
    }
    const have = new Set(current.map((row) => row.collectionId));
    for (const id of ids) {
      if (have.has(id)) continue;
      if (!(await addBookToGroup(userId, id, slug))) return { error: "The book is in your Library, but it couldn't be filed." };
    }
  }
  return { ok: true };
}
