import { apiJson } from "@/lib/api-response";
import { listCatalog } from "@/lib/catalog";
import { shortTitle } from "@/lib/title";

const LIMIT = 6;

/** GET /api/suggest?q=… — up to six title/author matches, prefix matches first. */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 80);
  if (q.length < 1) return apiJson({ suggestions: [] });

  const catalog = await listCatalog();
  const scored: { score: number; id: string; title: string; author: string }[] = [];
  for (const book of catalog) {
    const title = book.title.toLowerCase();
    const author = book.author.toLowerCase();
    let score = -1;
    if (title.startsWith(q)) score = 0;
    else if (author.startsWith(q)) score = 1;
    else if (title.split(/\s+/).some((word) => word.startsWith(q))) score = 2;
    else if (title.includes(q)) score = 3;
    else if (author.includes(q)) score = 4;
    if (score >= 0) scored.push({ score, id: book.id, title: book.title, author: book.author });
  }
  scored.sort((a, b) => a.score - b.score || a.title.localeCompare(b.title));
  const top = scored.slice(0, LIMIT);
  // Show the short name, unless two results would then read the same. Those keep their full titles.
  const key = (item: { title: string; author: string }) => `${shortTitle(item.title)}|${item.author}`.toLowerCase();
  const counts = new Map<string, number>();
  for (const item of top) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return apiJson({
    suggestions: top.map(({ id, title, author }) => ({
      id,
      title: counts.get(key({ title, author })) === 1 ? shortTitle(title) : title,
      author,
    })),
  });
}
