import Link from "next/link";
import { redirect } from "next/navigation";

import { BookCard } from "@/components/book-card";
import { CategoryFilter } from "@/components/category-filter";
import { EmptyState } from "@/components/empty-state";
import { FeaturedShelf } from "@/components/featured-shelf";
import { Button } from "@/components/ui/button";
import { filterBooks, getBooks } from "@/lib/books";
import { CATEGORIES, type Category } from "@/lib/types";
import { SearchX } from "lucide-react";

export const metadata = { title: "Browse" };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const category = CATEGORIES.includes(params.category as Category) ? params.category : undefined;
  const books = filterBooks(getBooks(), query, category);
  const searching = query.length > 0;
  if (searching) {
    const next = new URLSearchParams();
    next.set("q", query);
    if (category) next.set("category", category);
    redirect(`/search?${next.toString()}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 md:gap-8 md:px-8 md:py-8">
      {searching ? (
        <h1 className="serif text-[32px] leading-10">Results for “{query}”</h1>
      ) : (
        <FeaturedShelf books={getBooks()} />
      )}
      <CategoryFilter selected={category} query={query} />
      {books.length === 0 ? (
        <EmptyState
          icon={<SearchX size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
          title={searching ? "No books match that search." : "No books in this category."}
          action={
            <Button asChild variant="outline">
              <Link href="/browse">Clear search and filters</Link>
            </Button>
          }
        >
          {searching
            ? "Check the spelling, try an author’s last name, or remove the category filter."
            : "Pick another category, or clear the filter to see the full library."}
        </EmptyState>
      ) : (
        <section aria-label="Books">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:gap-x-6 md:gap-y-8">
            {books.map((book) => (
              <li key={book.id}>
                <BookCard book={book} showCategory />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
