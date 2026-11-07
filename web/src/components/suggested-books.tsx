import { BookGrid } from "@/components/book-grid";
import { getRecentBooks } from "@/lib/books";

/**
 * Real books under an empty state, so the page still offers somewhere to go.
 * Six on desktop, four on phones. Not labelled "popular": there is no download data to back that.
 */
export function SuggestedBooks() {
  const books = getRecentBooks().slice(0, 6);
  if (books.length === 0) return null;

  return (
    <section aria-labelledby="suggested-heading" className="page-enter">
      <h2 id="suggested-heading" className="section-title">
        Try one of these
      </h2>
      <BookGrid books={books} className="mt-4 max-md:[&>li:nth-child(n+5)]:hidden" />
    </section>
  );
}
