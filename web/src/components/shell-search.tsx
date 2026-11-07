"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";

import { SearchBar } from "@/components/search-bar";

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(max-width: 767px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function isNarrow() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function clearHref(pathname: string, params: URLSearchParams): string {
  const next = new URLSearchParams(params.toString());
  next.delete("q");
  next.delete("page");
  const value = next.toString();
  if (pathname === "/search") return value ? `/browse?${value}` : "/browse";
  return value ? `${pathname}?${value}` : pathname;
}

/** One search field. A new query keeps the category and sort already in the URL. */
export function ShellSearch() {
  const params = useSearchParams();
  const pathname = usePathname();
  const compact = useSyncExternalStore(subscribe, isNarrow, () => false);
  const query = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "";

  return (
    <SearchBar
      key={query}
      query={query}
      category={category}
      sort={sort}
      clearHref={query ? clearHref(pathname, params) : undefined}
      compact={compact}
    />
  );
}
