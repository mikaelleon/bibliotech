"use client";

import { Field } from "@/components/field";
import { Select } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/types";

/** Search and category stay in the URL. Enter submits the search. The select applies itself. */
export function AdminBooksFilters({
  query,
  category,
  missing,
  onApply,
}: {
  query: string;
  category?: string;
  missing?: string;
  /** Applies the fields in place. Without it, the form navigates. */
  onApply?: (next: { q: string; category: string }) => void;
}) {
  return (
    <form
      action="/admin/books"
      className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px] md:items-end"
      onSubmit={(event) => {
        if (!onApply) return;
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onApply({
          q: String(data.get("q") ?? "").trim(),
          category: String(data.get("category") ?? ""),
        });
      }}
    >
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
