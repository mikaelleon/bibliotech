import { apiJson } from "@/lib/api-response";
import { featuredEngagement } from "@/lib/featured-books";

/**
 * GET /api/featured — how often each book was downloaded, favorited, or added to a library.
 * Counts only. The Browse shelf on Android uses this when `book_engagement()` is not installed yet.
 */
export async function GET() {
  const scores = await featuredEngagement();
  return apiJson({ scores: Object.fromEntries(scores) });
}
