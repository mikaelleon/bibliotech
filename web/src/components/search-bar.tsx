"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { ShortcutHint } from "@/components/shortcut-hint";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  query?: string;
  /** Kept when the reader submits a new query, until they clear it. */
  category?: string;
  sort?: string;
  /** Where the clear control goes. Omitted when the field is empty. */
  clearHref?: string;
  /** Landing field is 56px. The shell field is 44px. */
  large?: boolean;
  /** Unused. Width decides the short placeholder, so the hint never overlaps it. */
  compact?: boolean;
  action?: (formData: FormData) => void | Promise<void>;
  className?: string;
};

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(min-width: 1024px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function wideEnough() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function SearchBar({
  query = "",
  category = "",
  sort = "",
  clearHref,
  large = false,
  action,
  className,
}: SearchBarProps) {
  const wide = useSyncExternalStore(subscribe, wideEnough, () => false);
  const placeholder = large || wide ? "Search by title or author" : "Search";
  const showClear = query.length > 0 && Boolean(clearHref);
  const showHint = wide && !showClear;

  return (
    <form
      action={action ?? "/search"}
      role="search"
      className={cn("relative min-w-0 flex-1", !large && "max-w-xl", className)}
    >
      <label htmlFor={large ? "landing-search" : "site-search"} className="sr-only">
        {placeholder}
      </label>
      <Search
        size={20}
        strokeWidth={1.5}
        aria-hidden
        className={cn("pointer-events-none absolute left-4 text-muted-foreground", large ? "top-[18px]" : "top-3")}
      />
      {category ? <input type="hidden" name="category" value={category} /> : null}
      {sort && sort !== "catalog" ? <input type="hidden" name="sort" value={sort} /> : null}
      <input
        id={large ? "landing-search" : "site-search"}
        name="q"
        defaultValue={query}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        className={cn(
          "w-full rounded-xl border border-border bg-card pl-12 text-base text-foreground placeholder:text-muted-foreground",
          large ? "h-14" : "h-11",
          showHint || showClear ? "pr-16" : "pr-4",
        )}
      />
      {showClear ? (
        <Link
          href={clearHref ?? "/browse"}
          aria-label="Clear search"
          className={cn(
            "absolute right-1.5 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground",
            large ? "top-3" : "top-1.5",
          )}
        >
          <X size={16} strokeWidth={1.5} aria-hidden />
        </Link>
      ) : showHint ? (
        <ShortcutHint large={large} />
      ) : null}
    </form>
  );
}
