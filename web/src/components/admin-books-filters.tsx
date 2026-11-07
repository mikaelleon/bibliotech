"use client";

import { Select } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/types";

/** Search and category stay in the URL. Enter submits the search. The select submits itself. */
export function AdminBooksFilters({ query, category }: { query: string; category?: string }) {
  return (
    <form action="/admin/books" className="flex flex-col gap-3 md:flex-row md:items-center">
      <label className="grid min-w-0 flex-1 gap-2 text-sm leading-5">
        <span className="sr-only">Search by title or author</span>
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by title or author"
          className="h-11 rounded-full border border-border bg-card px-4 text-base"
        />
      </label>
      <label className="grid gap-2 text-sm leading-5">
        <span className="sr-only">Category</span>
        <Select
          name="category"
          defaultValue={category ?? ""}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </label>
    </form>
  );
}
