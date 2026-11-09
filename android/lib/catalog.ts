import { useSyncExternalStore } from "react";

import { getBooks, setRemoteCatalog, type Book } from "@/lib/books";
import { supabase } from "@/lib/supabase";
import { cleanTitle } from "@/lib/title";
import { CATEGORIES, type Category } from "@/lib/types";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeCatalog(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-renders when the remote catalog replaces the static list. */
export function useCatalogBooks(): Book[] {
  return useSyncExternalStore(subscribeCatalog, getBooks, getBooks);
}

type Row = {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  language: string;
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

/** Load `books` from Supabase. Keeps the static list when the query fails or is empty. */
export async function loadRemoteCatalog(): Promise<void> {
  const { data, error } = await supabase.from("books").select("*").order("title", { ascending: true });
  if (error || !data?.length) return;
  const books = (data as Row[]).map((row) => ({
    id: row.slug,
    uuid: row.id,
    title: cleanTitle(row.title),
    author: row.author,
    category: (CATEGORIES.includes(row.category as Category) ? row.category : "Fiction") as Category,
    language: row.language,
    license: row.license,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    summary: row.summary,
    summaryShort: row.summary_short ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    hasFile: Boolean(row.file_path),
    fileSize: row.file_size_bytes ?? undefined,
    attribution: row.attribution ?? undefined,
  }));
  setRemoteCatalog(books);
  emit();
}
