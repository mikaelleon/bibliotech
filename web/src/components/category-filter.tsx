import Link from "next/link";

import { CATEGORIES } from "@/lib/types";
import { cn } from "@/lib/utils";

function hrefFor(category: string | null, query: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  const value = params.toString();
  return value ? `/browse?${value}` : "/browse";
}

/** Shareable category chips. The selected chip is charcoal, not coral. */
export function CategoryFilter({ selected, query }: { selected?: string; query?: string }) {
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
                href={hrefFor(chip === "All" ? null : chip, query ?? "")}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm leading-5 no-underline",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground",
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
