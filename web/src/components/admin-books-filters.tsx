"use client";

import { Field } from "@/components/field";
import { Select } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/types";

/** Search and category stay in the URL. Enter submits the search. The select submits itself. */
export function AdminBooksFilters({
  query,
  category,
  missing,
}: {
  query: string;
  category?: string;
  missing?: string;
}) {
  return (
    <form action="/admin/books" className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px] md:items-end">
      {missing ? <input type="hidden" name="missing" value={missing} /> : null}
      <Field label="Search by title or author" name="q" defaultValue={query} />
      <label className="grid text-sm font-medium leading-5">
        <span className="mb-1">Category</span>
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
