"use client";

import { useState, type ReactNode, Suspense } from "react";

import { CatalogSort } from "@/components/catalog-sort";
import { PageHeader } from "@/components/page-header";
import { ShelfGrid } from "@/components/shelf-grid";
import type { Shelf } from "@/components/shelf-provider";
import { sortBooks } from "@/lib/books";
import { replaceSearch } from "@/lib/replace-search";
import type { Book } from "@/lib/types";

/** Sort menu for Library and Favorites. Changing it reorders the shelf without scrolling to the top. */
export function SortedShelf({
  title,
  lede,
  books,
  sort,
  options,
  shelf,
  empty,
  belowHeader,
  footer,
  selecting,
  selected,
  onToggle,
}: {
  title: string;
  lede?: ReactNode;
  books: Book[];
  sort: string;
  options: { value: string; label: string }[];
  shelf: Shelf;
  empty: ReactNode;
  belowHeader?: ReactNode;
  footer?: ReactNode;
  selecting?: boolean;
  selected?: ReadonlySet<string>;
  onToggle?: (id: string) => void;
}) {
  const [current, setCurrent] = useState(sort);
  const [seen, setSeen] = useState(sort);
  if (seen !== sort) {
    setSeen(sort);
    setCurrent(sort);
  }

  const ordered = current === "title" || current === "author" ? sortBooks(books, current) : books;

  return (
    <>
      <PageHeader
        title={title}
        lede={lede}
        action={
          <Suspense>
            <CatalogSort
              value={current}
              options={options}
              onValueChange={(next) => {
                setCurrent(next);
                replaceSearch({ sort: next === options[0]?.value ? null : next });
              }}
            />
          </Suspense>
        }
      />
      {belowHeader}
      <ShelfGrid shelf={shelf} books={ordered} empty={empty} selecting={selecting} selected={selected} onToggle={onToggle} />
      {footer}
    </>
  );
}
