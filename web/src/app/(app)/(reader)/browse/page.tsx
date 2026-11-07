import Link from "next/link";
import { redirect } from "next/navigation";

import { BookGrid } from "@/components/book-grid";
import { CatalogToolbar } from "@/components/catalog-toolbar";
import { EmptyState } from "@/components/empty-state";
import { FeaturedShelf } from "@/components/featured-shelf";
import { Button } from "@/components/ui/button";
import { filterBooks, getBooks, sortBooks, type BookSort } from "@/lib/books";
import { listFavoriteIds, listLibrary } from "@/lib/records";
import { getSession } from "@/lib/session";
import { CATEGORIES, type Category } from "@/lib/types";
import { SearchX } from "lucide-react";

const sortOptions = [
  { value: "catalog", label: "Catalog order" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
];

export const metadata = { title: "Browse" };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const category = CATEGORIES.includes(params.category as Category) ? params.category : undefined;
  const sort: BookSort = params.sort === "title" || params.sort === "author" ? params.sort : "catalog";
  const books = sortBooks(filterBooks(getBooks(), query, category), sort);
  const searching = query.length > 0;
  if (searching) {
    const next = new URLSearchParams();
    next.set("q", query);
    if (category) next.set("category", category);
    if (sort !== "catalog") next.set("sort", sort);
    redirect(`/search?${next.toString()}`);
  }

  const session = await getSession();
  const library = session.kind === "user" ? await listLibrary(session.email) : [];
  const favoriteIds = session.kind === "user" ? await listFavoriteIds(session.email) : [];

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <FeaturedShelf books={getBooks()} signedIn={session.kind === "user"} favoriteIds={favoriteIds} />
      {library.length > 0 ? (
        <section aria-label="In your library">
          <h2 className="section-title">In your library</h2>
          <div className="mt-6">
            <BookGrid books={library} />
          </div>
        </section>
      ) : null}
      <CatalogToolbar
        count={books.length}
        category={category}
        query={query}
        sort={sort}
        base="/browse"
        options={sortOptions}
      />
      {books.length === 0 ? (
        <EmptyState
          icon={<SearchX size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
          title="No books in this category"
          action={
            <Button asChild variant="outline">
              <Link href="/browse">Show all books</Link>
            </Button>
          }
        >
          Pick another category, or show the full catalog.
        </EmptyState>
      ) : (
        <section aria-label="Books">
          <BookGrid books={books} />
        </section>
      )}
    </main>
  );
}
