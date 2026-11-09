import { supabase } from "@/lib/supabase";

export type CollectionKind = "reading_list" | "collection";

export type CollectionGroup = {
  id: string;
  name: string;
  kind: CollectionKind;
  bookIds: string[];
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

/** This account's reading lists and collections, oldest first. */
export async function loadCollections(userId: string): Promise<CollectionGroup[]> {
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
      .in("collection_id", ids);
    for (const row of (items.data ?? []) as ItemRow[]) {
      const slug = slugOf(row);
      if (!slug) continue;
      const list = books.get(row.collection_id) ?? [];
      list.push({ slug, position: row.position });
      books.set(row.collection_id, list);
    }
  }
  return data.flatMap((row) => {
    const kind = row.kind === "reading_list" || row.kind === "collection" ? row.kind : null;
    if (!kind) return [];
    const ordered = (books.get(row.id as string) ?? []).sort((a, b) => a.position - b.position);
    return [{ id: row.id as string, name: row.name as string, kind, bookIds: ordered.map((item) => item.slug) }];
  });
}

export async function createGroup(userId: string, name: string, kind: CollectionKind): Promise<{ id: string } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) return { error: "Enter a name up to 80 characters." };
  const { data, error } = await supabase.from("collections").insert({ user_id: userId, name: trimmed, kind }).select("id").single();
  if (error) {
    if (error.code === "23505") return { error: `You already have one named ${trimmed}.` };
    return { error: "We couldn't create that. Try again." };
  }
  return { id: data.id as string };
}

export async function addBookToGroup(userId: string, collectionId: string, slug: string): Promise<boolean> {
  const owned = await supabase.from("collections").select("id").eq("id", collectionId).eq("user_id", userId).maybeSingle();
  if (!owned.data) return false;
  const book = await supabase.from("books").select("id").eq("slug", slug).maybeSingle();
  if (!book.data?.id) return false;
  const last = await supabase.from("collection_items").select("position").eq("collection_id", collectionId).order("position", { ascending: false }).limit(1);
  const position = ((last.data?.[0]?.position as number | undefined) ?? -1) + 1;
  const { error } = await supabase
    .from("collection_items")
    .upsert({ collection_id: collectionId, book_id: book.data.id, position }, { onConflict: "collection_id,book_id", ignoreDuplicates: true });
  return !error;
}

export async function deleteGroup(userId: string, collectionId: string): Promise<boolean> {
  const { error } = await supabase.from("collections").delete().eq("id", collectionId).eq("user_id", userId);
  return !error;
}

/** Leaving the shelf drops the book from every reading list and collection. */
export async function removeBookFromGroups(slug: string): Promise<void> {
  const book = await supabase.from("books").select("id").eq("slug", slug).maybeSingle();
  if (!book.data?.id) return;
  await supabase.from("collection_items").delete().eq("book_id", book.data.id);
}
