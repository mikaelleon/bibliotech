import "server-only";

import { cache } from "react";

import { getBooks, setRemoteCatalog, type Book } from "@/lib/books";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, type Category } from "@/lib/types";

type Row = {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  language: string;
  published: string | null;
  license: string;
  source_name: string;
  source_url: string;
  summary: string;
  summary_short: string | null;
  cover_url: string | null;
  file_path: string | null;
  file_size_bytes: number | null;
  attribution: string | null;
};

function categoryOf(value: string): Category {
  return CATEGORIES.includes(value as Category) ? (value as Category) : "Fiction";
}

function toBook(row: Row): Book {
  return {
    id: row.slug,
    uuid: row.id,
    title: row.title,
    author: row.author,
    category: categoryOf(row.category),
    language: row.language,
    published: row.published ?? undefined,
    license: row.license,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    summary: row.summary,
    summaryShort: row.summary_short ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    hasFile: Boolean(row.file_path),
    fileSize: row.file_size_bytes ?? undefined,
    attribution: row.attribution ?? undefined,
  };
}

const CATALOG_TTL_MS = 60_000;
let catalogCache: { at: number; books: Book[] } | null = null;

/**
 * Catalog from `books`. Falls back to the static list when the database is empty or unreachable,
 * so the app still opens before the importer has run.
 * Repeated calls in one render share one query, and the result is reused for a minute so
 * moving between screens does not wait on the catalog again.
 */
export const listCatalog = cache(async function listCatalog(): Promise<Book[]> {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
    setRemoteCatalog(catalogCache.books);
    return getBooks();
  }
  const loaded = await loadCatalog();
  if (loaded.remote) catalogCache = { at: Date.now(), books: loaded.books };
  return loaded.books;
});

async function loadCatalog(): Promise<{ books: Book[]; remote: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("books").select("*").order("title", { ascending: true });
    if (error || !data?.length) return { books: setAndReturn([]), remote: false };
    return { books: setAndReturn((data as Row[]).map(toBook)), remote: true };
  } catch {
    return { books: setAndReturn([]), remote: false };
  }
}

function setAndReturn(rows: Book[]): Book[] {
  setRemoteCatalog(rows);
  return getBooks();
}
