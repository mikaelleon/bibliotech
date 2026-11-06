import Link from "next/link";
import { SearchX } from "lucide-react";

import { BookCard } from "@/components/book-card";
import { CategoryFilter } from "@/components/category-filter";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { filterBooks, getBooks } from "@/lib/books";
import { CATEGORIES, type Category } from "@/lib/types";

const pageSize = 24;

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const category = CATEGORIES.includes(params.category as Category) ? params.category : undefined;
  const requested = Number(params.page ?? "1");
  const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;
  const matches = filterBooks(getBooks(), query, category);
  const start = (page - 1) * pageSize;
  const visible = matches.slice(start, start + pageSize);
  const countLabel = matches.length === 1 ? "1 book" : `${matches.length} books`;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title={query ? `Results for “${query}”` : "Search"}
        lede={query ? countLabel : "Search by title or author."}
      />
      <SearchBar query={query} />
      <CategoryFilter selected={category} query={query} base="/search" />
      {matches.length === 0 ? (
        <EmptyState
          icon={<SearchX size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
          title="No books match that search."
          action={
            <Button asChild variant="outline">
              <Link href="/search">Clear search</Link>
            </Button>
          }
        >
          Try a different title, author, or category.
        </EmptyState>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
            {visible.map((book) => (
              <li key={book.id}>
                <BookCard book={book} />
              </li>
            ))}
          </ul>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={matches.length}
              pathname="/search"
              params={{ q: query || undefined, category }}
            />
          </div>
        </>
      )}
    </main>
  );
}
