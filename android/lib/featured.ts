import { useSyncExternalStore } from "react";

import { apiBase } from "@/lib/api";
import { subscribeCatalog } from "@/lib/catalog";
import { getBooks } from "@/lib/books";
import { supabase } from "@/lib/supabase";
import type { Book } from "@/lib/types";

/**
 * Featured shelf on Browse. Keep this ranking in step with web/src/lib/featured.ts.
 *
 * With no reader activity, the shelf is only the most widely known works in the catalog,
 * in the order below. A download, a favorite, or a library add raises that book.
 * Each of those counts once per time it happens: repeat downloads count again,
 * while a favorite or a library add is one row per reader.
 * A book outside this list joins the shelf only after it has been used,
 * and the shelf never grows past the length of the list.
 */

export type Engagement = {
  downloads: number;
  favorites: number;
  libraryAdds: number;
};

export type EngagementTable = ReadonlyMap<string, Engagement>;

type RankedBook = { id: string; title: string };

type KnownWork = {
  /** `books.slug` for the edition already in the catalog. */
  slug: string;
  /** Titles that name the same work when the slug differs. */
  titles: string[];
};

const KNOWN: KnownWork[] = [
  { slug: "pride-and-prejudice", titles: ["Pride and Prejudice"] },
  { slug: "frankenstein", titles: ["Frankenstein"] },
  { slug: "alice", titles: ["Alice's Adventures in Wonderland"] },
  { slug: "dracula", titles: ["Dracula"] },
  { slug: "moby-dick", titles: ["Moby-Dick", "Moby Dick"] },
  { slug: "the-adventures-of-sherlock-holmes", titles: ["The Adventures of Sherlock Holmes"] },
  { slug: "great-expectations", titles: ["Great Expectations"] },
  { slug: "a-tale-of-two-cities", titles: ["A Tale of Two Cities"] },
  { slug: "jane-eyre-an-autobiography", titles: ["Jane Eyre", "Jane Eyre: An Autobiography"] },
  { slug: "wuthering-heights", titles: ["Wuthering Heights"] },
  { slug: "the-wonderful-wizard-of-oz", titles: ["The Wonderful Wizard of Oz", "The Wizard of Oz"] },
  { slug: "little-women", titles: ["Little Women"] },
  {
    slug: "a-christmas-carol-in-prose-being-a-ghost-story-of-christmas",
    titles: ["A Christmas Carol", "A Christmas Carol in Prose"],
  },
  { slug: "peter-pan", titles: ["Peter Pan", "Peter and Wendy"] },
  { slug: "the-art-of-war", titles: ["The Art of War"] },
  { slug: "meditations", titles: ["Meditations"] },
];

/** The shelf stays this long, so one active book cannot turn the whole catalog into Featured. */
export const FEATURED_LIMIT = KNOWN.length;

export function engagementScore(row: Engagement | undefined): number {
  if (!row) return 0;
  return row.downloads + row.favorites + row.libraryAdds;
}

function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Title before a subtitle. "Moby-Dick; or, The Whale" is "Moby-Dick". */
function shortName(title: string): string {
  const clean = title.replace(/\s+/g, " ").trim();
  const cut = clean.search(/[:;] /);
  return cut >= 4 ? clean.slice(0, cut) : clean;
}

function namesOf(book: RankedBook): string[] {
  return [fold(book.title), fold(shortName(book.title))];
}

/** One catalog row per known work. Prefer the slug, then a matching title. */
function knownBooks<T extends RankedBook>(catalog: readonly T[]): T[] {
  const used = new Set<string>();
  const chosen: T[] = [];
  for (const work of KNOWN) {
    const titles = new Set(work.titles.map(fold));
    const exact = catalog.find((book) => book.id === work.slug && !used.has(book.id));
    const match =
      exact ??
      catalog.find((book) => !used.has(book.id) && namesOf(book).some((name) => titles.has(name)));
    if (!match) continue;
    used.add(match.id);
    chosen.push(match);
  }
  return chosen;
}

/**
 * Order the shelf. Higher use comes first. Equal scores keep the known-literature order,
 * and an unused book that is not in that list stays off the shelf.
 */
export function rankFeatured<T extends RankedBook>(
  catalog: readonly T[],
  scores: EngagementTable = new Map(),
): T[] {
  if (catalog.length === 0) return [];
  const known = knownBooks(catalog);
  const knownIds = new Set(known.map((book) => book.id));
  const rank = new Map(known.map((book, index) => [book.id, index]));
  const pool = new Map<string, T>();
  for (const book of known) pool.set(book.id, book);
  for (const book of catalog) {
    if (knownIds.has(book.id)) continue;
    if (engagementScore(scores.get(book.id)) > 0) pool.set(book.id, book);
  }
  return [...pool.values()]
    .sort((a, b) => {
      const byScore = engagementScore(scores.get(b.id)) - engagementScore(scores.get(a.id));
      if (byScore !== 0) return byScore;
      const rankA = rank.get(a.id) ?? KNOWN.length;
      const rankB = rank.get(b.id) ?? KNOWN.length;
      if (rankA !== rankB) return rankA - rankB;
      return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    })
    .slice(0, FEATURED_LIMIT);
}

type EngagementRow = {
  slug: string;
  downloads: number | string | null;
  favorites: number | string | null;
  library_adds: number | string | null;
};

const listeners = new Set<() => void>();
let scores: EngagementTable = new Map();

function emit() {
  for (const listener of listeners) listener();
}

function subscribeFeatured(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function currentScores() {
  return scores;
}

function count(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function scoresFromRows(rows: EngagementRow[]): Map<string, Engagement> {
  const next = new Map<string, Engagement>();
  for (const row of rows) {
    if (!row.slug) continue;
    const engagement = {
      downloads: count(row.downloads),
      favorites: count(row.favorites),
      libraryAdds: count(row.library_adds),
    };
    if (engagementScore(engagement) > 0) next.set(row.slug, engagement);
  }
  return next;
}

/** Counts from `book_engagement()`. Null when that function is not installed yet. */
async function scoresFromDatabase(): Promise<Map<string, Engagement> | null> {
  const { data, error } = await supabase.rpc("book_engagement");
  if (error || !data) return null;
  return scoresFromRows(data as EngagementRow[]);
}

/** Same counts from the web app, for a phone that can reach it before the database function is applied. */
async function scoresFromApi(): Promise<Map<string, Engagement> | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const response = await fetch(`${base}/api/featured`);
    if (!response.ok) return null;
    const body = (await response.json()) as { scores?: Record<string, Engagement> };
    const next = new Map<string, Engagement>();
    for (const [slug, row] of Object.entries(body.scores ?? {})) {
      const engagement = {
        downloads: count(row?.downloads),
        favorites: count(row?.favorites),
        libraryAdds: count(row?.libraryAdds),
      };
      if (engagementScore(engagement) > 0) next.set(slug, engagement);
    }
    return next;
  } catch {
    return null;
  }
}

/** Reload download, favorite, and library counts. If neither source answers, the known-literature shelf stays. */
export async function loadFeaturedScores(): Promise<void> {
  const fromDatabase = await scoresFromDatabase();
  const next = fromDatabase ?? (await scoresFromApi());
  if (!next) return;
  scores = next;
  emit();
}

/** Featured books for Browse. Re-renders when the catalog or the counts change. */
export function useFeaturedBooks(): Book[] {
  const books = useSyncExternalStore(subscribeCatalog, getBooks, getBooks);
  const engagement = useSyncExternalStore(subscribeFeatured, currentScores, currentScores);
  return rankFeatured(books, engagement);
}
