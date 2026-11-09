"use client";

import { SearchX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BookGrid } from "@/components/book-grid";
import { CatalogToolbar } from "@/components/catalog-toolbar";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { SuggestedBooks } from "@/components/suggested-books";
import { Button } from "@/components/ui/button";
import { filterBooks, sortBooks, type BookSort } from "@/lib/books";
import { replaceSearch } from "@/lib/replace-search";
import type { Book } from "@/lib/types";

/**
 * Category chips and the sort menu filter this list in place.
 * The address bar still updates, but the page does not navigate, so the scroll position stays.
 */
export function CatalogResults({
  books,
  category,
  sort,
  query = "",
  page = 1,
  pageSize,
  base,
  options,
  suggest = false,
}: {
  books: Book[];
  category?: string;
  sort: BookSort;
  query?: string;
  page?: number;
  pageSize?: number;
  base: string;
  options: { value: string; label: string }[];
  suggest?: boolean;
}) {
  const [currentCategory, setCategory] = useState(category ?? "");
  const [currentSort, setSort] = useState<BookSort>(sort);
  const [currentPage, setPage] = useState(page);
  const signature = `${category ?? ""}|${sort}|${page}|${query}`;
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setCategory(category ?? "");
    setSort(sort);
    setPage(page);
  }

  const defaultSort = options[0]?.value ?? "catalog";
  const matches = sortBooks(filterBooks(books, query, currentCategory || undefined), currentSort);
  const paging = Boolean(pageSize) && (base !== "/browse" || currentCategory === "");
  const pageCount = paging && pageSize ? Math.max(1, Math.ceil(matches.length / pageSize)) : 1;
  const safePage = Math.min(currentPage, pageCount);
  const visible = paging && pageSize ? matches.slice((safePage - 1) * pageSize, safePage * pageSize) : matches;

  function selectCategory(next: string | null) {
    setCategory(next ?? "");
    setPage(1);
    replaceSearch({ category: next, page: null });
  }

  function selectSort(next: string) {
    const value: BookSort = next === "title" || next === "author" ? next : "catalog";
    setSort(value);
    setPage(1);
    replaceSearch({ sort: next === defaultSort ? null : next, page: null });
  }

  function selectPage(next: number) {
    setPage(next);
    replaceSearch({ page: next > 1 ? String(next) : null });
    const booksHeading = document.getElementById("browse-books");
    if (base === "/browse" && booksHeading) booksHeading.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  }

  return (
    <>
      <CatalogToolbar
        count={matches.length}
        category={currentCategory || undefined}
        query={query}
        sort={currentSort}
        base={base}
        options={options}
        onCategory={selectCategory}
        onSort={selectSort}
      />
      {matches.length === 0 ? (
        <>
          <EmptyState
            icon={<SearchX size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
            title={
              base === "/browse"
                ? currentCategory
                  ? `No books in ${currentCategory}`
                  : "No books yet"
                : query
                  ? `No matches for “${query}”`
                  : `No books in ${currentCategory || "this category"}`
            }
            action={
              base === "/browse" || (currentCategory && query) ? (
                <Button variant="outline" onClick={() => selectCategory(null)}>
                  {base === "/browse" ? "Show all books" : "Search all categories"}
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/browse">Clear search</Link>
                </Button>
              )
            }
          >
            {query ? "Check the spelling or search by author." : "Try another category."}
          </EmptyState>
          {suggest ? <SuggestedBooks /> : null}
        </>
      ) : base === "/browse" ? (
        <>
          <section id="browse-books" aria-label="Books" className="scroll-mt-24">
            <BookGrid books={visible} />
          </section>
          {paging && pageSize && matches.length > pageSize ? (
            <div className="overflow-hidden rounded-xl bg-card">
              <Pagination
                page={safePage}
                pageSize={pageSize}
                total={matches.length}
                pathname={base}
                params={{
                  category: currentCategory || undefined,
                  sort: currentSort === defaultSort ? undefined : currentSort,
                }}
                onPage={selectPage}
              />
            </div>
          ) : null}
        </>
      ) : (
        <>
          <BookGrid books={visible} />
          {pageSize ? (
            <div className="overflow-hidden rounded-xl bg-card">
              <Pagination
                page={safePage}
                pageSize={pageSize}
                total={matches.length}
                pathname={base}
                params={{
                  q: query || undefined,
                  category: currentCategory || undefined,
                  sort: currentSort === defaultSort ? undefined : currentSort,
                }}
                onPage={selectPage}
              />
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
