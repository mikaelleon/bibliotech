import { Suspense } from "react";

import { CatalogSort } from "@/components/catalog-sort";
import { CategoryFilter } from "@/components/category-filter";

/** Category, result count, and sort. Sticks under the header while the catalog scrolls. */
export function CatalogToolbar({
  count,
  category,
  query = "",
  sort,
  base,
  options,
  onCategory,
  onSort,
}: {
  count: number;
  category?: string;
  query?: string;
  sort: string;
  base: string;
  options: { value: string; label: string }[];
  onCategory?: (category: string | null) => void;
  onSort?: (sort: string) => void;
}) {
  const books = count === 1 ? "1 book" : `${count} books`;
  const summary = category ? `${books} in ${category}` : books;

  return (
    <div className="sticky top-[68px] z-20 -mx-4 -mt-8 bg-background px-4 pt-8 pb-3 md:-mx-8 md:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <CategoryFilter selected={category} query={query} sort={sort} base={base} onSelect={onCategory} />
        </div>
        <p className="shrink-0 text-sm leading-5 text-muted-foreground" aria-live="polite">
          {summary}
        </p>
        <Suspense>
          <CatalogSort value={sort} options={options} onValueChange={onSort} />
        </Suspense>
      </div>
    </div>
  );
}
