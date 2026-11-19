"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";

type Item = { href: string; current: (path: string) => boolean };

/**
 * Optimistic active item for a nav group. The click lights the destination on the same frame,
 * instead of waiting for the route to commit, and the highlight settles on whatever the route
 * really is once it does (so a cancelled or redirected navigation falls back by itself).
 */
export function usePendingNav(items: Item[]) {
  const path = usePathname();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    setPending(null);
  }, [path]);

  const active = pending ?? items.find((item) => item.current(path))?.href;
  const isCurrent = (item: Item) => (pending ? item.href === pending : item.current(path));
  const onNavigate = (item: Item) => (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!item.current(path)) setPending(item.href);
  };

  return { active, isCurrent, onNavigate };
}
