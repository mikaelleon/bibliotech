import type { CatalogLine } from "./prompt.ts";

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "about", "any", "some",
  "book", "books", "novel", "read", "reading", "suggest", "recommend", "find", "me", "i", "is",
  "are", "do", "you", "have", "what", "which", "who", "by", "that", "this", "it", "short", "good",
]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Used only when the catalog is bigger than AI_CATALOG_FULL_MAX: keeps the best keyword matches
 * (title and author weigh most) so the prompt stays small. Same prompt shape, still one call.
 */
export function selectRelevant(all: CatalogLine[], query: string, max: number): CatalogLine[] {
  const terms = [...new Set(words(query))];
  const scored = all.map((book, index) => {
    const title = book.title.toLowerCase();
    const author = book.author.toLowerCase();
    const category = book.category.toLowerCase();
    const summary = book.summary.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 4;
      if (author.includes(term)) score += 4;
      if (category.includes(term)) score += 2;
      if (summary.includes(term)) score += 1;
    }
    return { book, index, score };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, max).map((s) => s.book);
}
