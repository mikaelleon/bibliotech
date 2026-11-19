import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { cleanTitle } from "@/lib/title";

import type { CatalogLine } from "./prompt";

const TTL_MS = 60_000;
let cache: { at: number; lines: CatalogLine[] } | null = null;

type Row = {
  slug: string;
  title: string;
  author: string;
  category: string;
  summary: string;
  summary_short: string | null;
};

/**
 * Compact catalog for the assistant. A plain read with the publishable key (`books_select_all`
 * makes the table public), so it works for cookie and Bearer callers alike and never touches the
 * global that `listCatalog()` mutates. Cached for a minute, like the catalog the pages use.
 */
export async function getCatalogForAssistant(): Promise<CatalogLine[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.lines;

  const supabase = createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase
    .from("books")
    .select("slug, title, author, category, summary, summary_short")
    .order("title", { ascending: true });
  if (error) throw new Error("catalog_unavailable");

  const lines = ((data ?? []) as Row[]).map((row) => ({
    slug: row.slug,
    title: cleanTitle(row.title),
    author: row.author,
    category: row.category,
    summary: row.summary_short?.trim() || row.summary,
  }));
  cache = { at: Date.now(), lines };
  return lines;
}
