import { apiError, apiJson } from "@/lib/api-response";
import { requestUser } from "@/lib/supabase/request";

type HistoryRow = {
  first_downloaded_at: string;
  last_downloaded_at: string;
  times_downloaded: number;
  last_device_label: string | null;
  books: { slug: string; title: string; author: string } | { slug: string; title: string; author: string }[] | null;
};

/** GET /api/downloads — this account's download history. */
export async function GET(request: Request) {
  const user = await requestUser(request);
  if (!user) return apiError(401, "UNAUTHENTICATED", "Log in to see your downloads.");

  const page = Math.max(1, Number(new URL(request.url).searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(new URL(request.url).searchParams.get("pageSize") ?? "50") || 50));
  const from = (page - 1) * pageSize;

  const { data, error, count } = await user.supabase
    .from("downloads")
    .select("first_downloaded_at, last_downloaded_at, times_downloaded, last_device_label, books(slug, title, author)", { count: "exact" })
    .eq("user_id", user.id)
    .order("last_downloaded_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) return apiError(500, "HISTORY_UNAVAILABLE", "We couldn't load your downloads.");

  const downloads = ((data ?? []) as HistoryRow[]).flatMap((row) => {
    const book = Array.isArray(row.books) ? row.books[0] : row.books;
    if (!book) return [];
    return [
      {
        id: book.slug,
        title: book.title,
        author: book.author,
        firstDownloadedAt: row.first_downloaded_at,
        lastDownloadedAt: row.last_downloaded_at,
        times: row.times_downloaded,
        device: row.last_device_label,
      },
    ];
  });

  return apiJson({ downloads, page, pageSize, total: count ?? downloads.length });
}
