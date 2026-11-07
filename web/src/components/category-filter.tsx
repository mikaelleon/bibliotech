"use client";

import Link from "next/link";

import { CATEGORIES } from "@/lib/types";
import { useIndicator } from "@/lib/use-indicator";
import { cn } from "@/lib/utils";

function hrefFor(base: string, category: string | null, query: string, sort: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (sort && sort !== "catalog") params.set("sort", sort);
  const value = params.toString();
  return value ? `${base}?${value}` : base;
}

/**
 * Shareable category chips. The selected fill is one charcoal indicator that slides between chips.
 * Unselected chip fills sit under the indicator, so it stays visible while it moves.
 */
export function CategoryFilter({
  selected,
  query,
  sort = "",
  base = "/browse",
  onSelect,
}: {
  selected?: string;
  query?: string;
  sort?: string;
  base?: string;
  /** When set, a click filters in place instead of navigating. */
  onSelect?: (category: string | null) => void;
}) {
  const current = selected && CATEGORIES.includes(selected as (typeof CATEGORIES)[number]) ? selected : "All";
  const chips = ["All", ...CATEGORIES];
  const { containerRef, indicatorRef } = useIndicator<HTMLUListElement>(current);

  return (
    <nav aria-label="Filter by category" className="-mx-4 md:mx-0">
      <ul
        ref={containerRef}
        className="scrollbar-none relative isolate flex gap-2 overflow-x-auto px-4 md:flex-wrap md:overflow-visible md:px-0"
      >
        <span ref={indicatorRef} aria-hidden className="nav-indicator -z-10 rounded-xl bg-primary opacity-0" />
        {chips.map((chip) => {
          const on = chip === current;
          return (
            <li key={chip} className="shrink-0">
              <Link
                href={hrefFor(base, chip === "All" ? null : chip, query ?? "", sort)}
                scroll={false}
                onClick={(event) => {
                  if (!onSelect) return;
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  onSelect(chip === "All" ? null : chip);
                }}
                aria-current={on ? "true" : undefined}
                data-indicator-target={on}
                className={cn(
                  "press relative inline-flex min-h-11 items-center rounded-xl px-4 text-sm leading-5 no-underline",
                  on
                    ? "text-primary-foreground"
                    : "text-foreground before:absolute before:inset-0 before:-z-20 before:rounded-xl before:bg-card before:transition-colors before:duration-[var(--dur-hover)] hover:before:bg-border",
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
