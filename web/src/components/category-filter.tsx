"use client";

import {
  Baby,
  BookOpen,
  Briefcase,
  Cpu,
  Feather,
  FlaskConical,
  GraduationCap,
  Hourglass,
  LayoutGrid,
  Landmark,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { CATEGORIES } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  All: LayoutGrid,
  Fiction: BookOpen,
  Classics: Landmark,
  Philosophy: Lightbulb,
  History: Hourglass,
  Science: FlaskConical,
  Technology: Cpu,
  Business: Briefcase,
  Poetry: Feather,
  Children: Baby,
  Education: GraduationCap,
};

function hrefFor(base: string, category: string | null, query: string, sort: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (sort && sort !== "catalog") params.set("sort", sort);
  const value = params.toString();
  return value ? `${base}?${value}` : base;
}

/**
 * Shareable category chips. Each rests as a 44px icon; the selected one widens to show its name.
 * The label opens with a grid-column transition, so only the chosen chip ever takes more room.
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
  const listRef = useRef<HTMLUListElement>(null);

  // The row scrolls on narrow screens, so a category from a shared link must not start off screen.
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!list || !active) return;
    const left = active.offsetLeft - 16;
    const right = active.offsetLeft + active.offsetWidth + 80 - list.clientWidth;
    if (left < list.scrollLeft) list.scrollTo({ left: Math.max(0, left) });
    else if (right > list.scrollLeft) list.scrollTo({ left: right });
  }, [current]);

  return (
    <nav aria-label="Filter by category" className="-mx-4 md:mx-0">
      <ul
        ref={listRef}
        className="scrollbar-none relative flex gap-2 overflow-x-auto px-4 md:px-0"
      >
        {chips.map((chip) => {
          const on = chip === current;
          const Icon = ICONS[chip];
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
                aria-label={chip}
                title={chip}
                className={cn(
                  "press inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-3 text-sm leading-5 no-underline",
                  on ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-border",
                )}
              >
                <Icon size={20} strokeWidth={1.5} aria-hidden className="shrink-0" />
                <span
                  aria-hidden
                  className={cn(
                    "grid transition-[grid-template-columns,opacity] duration-[var(--dur-move)] ease-[var(--ease-in-out)] motion-reduce:transition-none",
                    on ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0",
                  )}
                >
                  <span className="min-w-0 overflow-hidden">
                    <span className="block pl-2 whitespace-nowrap">{chip}</span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
