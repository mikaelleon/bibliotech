import "server-only";

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

/**
 * Catalog from `books`. Falls back to the static list when the database is empty or unreachable,
 * so the app still opens before the importer has run.
 */
export async function listCatalog(): Promise<Book[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("books").select("*").order("title", { ascending: true });
    if (error || !data?.length) return setAndReturn([]);
    return setAndReturn((data as Row[]).map(toBook));
  } catch {
    return setAndReturn([]);
  }
}

function setAndReturn(rows: Book[]): Book[] {
  setRemoteCatalog(rows);
  return getBooks();
}
