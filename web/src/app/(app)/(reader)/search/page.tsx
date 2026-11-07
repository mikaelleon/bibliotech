import Link from "next/link";
import { SearchX } from "lucide-react";

import { BookGrid } from "@/components/book-grid";
import { CatalogToolbar } from "@/components/catalog-toolbar";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { filterBooks, getBooks, sortBooks, type BookSort } from "@/lib/books";
import { CATEGORIES, type Category } from "@/lib/types";

const pageSize = 24;
const sortOptions = [
  { value: "catalog", label: "Best match" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
];

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const category = CATEGORIES.includes(params.category as Category) ? params.category : undefined;
  const sort: BookSort = params.sort === "title" || params.sort === "author" ? params.sort : "catalog";
  const requested = Number(params.page ?? "1");
  const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;
  const matches = sortBooks(filterBooks(getBooks(), query, category), sort);
  const start = (page - 1) * pageSize;
  const visible = matches.slice(start, start + pageSize);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title={query ? `Results for “${query}”` : "Search"} />
      <CatalogToolbar
        count={matches.length}
        category={category}
        query={query}
        sort={sort}
        base="/search"
        options={sortOptions}
      />
      {matches.length === 0 ? (
        <EmptyState
          icon={<SearchX size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
          title="No books match that search"
          action={
            <Button asChild variant="outline">
              <Link href={category ? `/search?q=${encodeURIComponent(query)}` : "/browse"}>
                {category ? "Search all categories" : "Clear search"}
              </Link>
            </Button>
          }
        >
          {category
            ? "Nothing in this category matches. Search the rest of the catalog, or try another title or author."
            : "Check the spelling, or try the author’s last name."}
        </EmptyState>
      ) : (
        <>
          <BookGrid books={visible} />
          <div className="overflow-hidden rounded-xl bg-card">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={matches.length}
              pathname="/search"
              params={{ q: query || undefined, category, sort: sort === "catalog" ? undefined : sort }}
            />
          </div>
        </>
      )}
    </main>
  );
}
