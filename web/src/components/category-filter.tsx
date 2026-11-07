import Link from "next/link";

import { CATEGORIES } from "@/lib/types";
import { cn } from "@/lib/utils";

function hrefFor(base: string, category: string | null, query: string, sort: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (sort && sort !== "catalog") params.set("sort", sort);
  const value = params.toString();
  return value ? `${base}?${value}` : base;
}

/** Shareable category chips. The selected chip is charcoal, not coral. */
export function CategoryFilter({
  selected,
  query,
  sort = "",
  base = "/browse",
}: {
  selected?: string;
  query?: string;
  sort?: string;
  base?: string;
}) {
  const current = selected && CATEGORIES.includes(selected as (typeof CATEGORIES)[number]) ? selected : "All";
  const chips = ["All", ...CATEGORIES];

  return (
    <nav aria-label="Filter by category" className="-mx-4 md:mx-0">
      <ul className="flex gap-2 overflow-x-auto px-4 md:flex-wrap md:overflow-visible md:px-0">
        {chips.map((chip) => {
          const on = chip === current;
          return (
            <li key={chip} className="shrink-0">
              <Link
                href={hrefFor(base, chip === "All" ? null : chip, query ?? "", sort)}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "press inline-flex min-h-11 items-center rounded-xl px-4 text-sm leading-5 no-underline",
                  on ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
                )}
              >
                {chip}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
