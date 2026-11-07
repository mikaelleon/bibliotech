"use client";

import { useState } from "react";

import { AdminBooksFilters } from "@/components/admin-books-filters";
import { AdminBooksTable } from "@/components/admin-books-table";
import { EmptyRow } from "@/components/empty-row";
import { Pagination } from "@/components/pagination";
import { filterBooks } from "@/lib/books";
import { replaceSearch } from "@/lib/replace-search";
import type { Book } from "@/lib/types";

const pageSize = 25;

/** Category and search filter the books table without sending the page back to the top. */
export function AdminBooksBrowser({
  books,
  query,
  category,
  missing,
  page,
}: {
  books: Book[];
  query: string;
  category?: string;
  missing?: string;
  page: number;
}) {
  const [currentQuery, setQuery] = useState(query);
  const [currentCategory, setCategory] = useState(category ?? "");
  const [currentPage, setPage] = useState(page);
  const [formKey, setFormKey] = useState(0);
  const signature = `${query}|${category ?? ""}|${missing ?? ""}|${page}`;
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setQuery(query);
    setCategory(category ?? "");
    setPage(page);
    setFormKey((key) => key + 1);
  }

  const matches = filterBooks(books, currentQuery, currentCategory || undefined).filter((book) => {
    if (missing === "cover") return !book.coverUrl;
    if (missing === "license") return book.license.trim() === "";
    return true;
  });
  const visible = matches.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function apply(next: { q: string; category: string }) {
    setQuery(next.q);
    setCategory(next.category);
    setPage(1);
    replaceSearch({ q: next.q || null, category: next.category || null, page: null });
  }

  function clear() {
    setQuery("");
    setCategory("");
    setPage(1);
    setFormKey((key) => key + 1);
    replaceSearch({ q: null, category: null, page: null });
  }

  function selectPage(next: number) {
    setPage(next);
    replaceSearch({ page: next > 1 ? String(next) : null });
    window.scrollTo(0, 0);
  }

  return (
    <>
      <AdminBooksFilters key={formKey} query={currentQuery} category={currentCategory || undefined} missing={missing} onApply={apply} />
      <div>
        <AdminBooksTable
          books={visible}
          empty={
            missing ? (
              "Nothing to fix"
            ) : currentQuery ? (
              <EmptyRow title={`No books match “${currentQuery}”`} onClear={clear} />
            ) : currentCategory ? (
              <EmptyRow title={`No books in ${currentCategory}`} onClear={clear} clearLabel="Show all books" />
            ) : (
              "No books yet"
            )
          }
        />
        <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card">
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={matches.length}
            pathname="/admin/books"
            params={{ q: currentQuery || undefined, category: currentCategory || undefined, missing }}
            onPage={selectPage}
          />
        </div>
      </div>
    </>
  );
}
