"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { durDrawer, easeInOut, prefersReducedMotion } from "@/lib/motion";

/** A flight older than this (a slow load, or the reader went elsewhere) is dropped. */
const FLIGHT_TTL = 2000;

let flight: { name: string; rect: DOMRect; at: number } | null = null;

/**
 * Card-to-cover morph without holding the page.
 *
 * Clicking a book card (`a[data-vt-cover]`) records where its cover sits; navigation then runs
 * normally. When the book page, or its loading screen, commits, its cover (`[data-cover]`, or
 * `[data-vt-target]` on the skeleton) animates from the card's spot to its own (FLIP: transform
 * only, 300ms, ease-in-out). An earlier version used a view transition, which freezes the screen
 * until the next page renders; on a slow load that read as lag.
 */
export function ViewTransitions() {
  const pathname = usePathname();

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[data-vt-cover]");
      const name = anchor?.dataset.vtCover;
      const cover = anchor?.querySelector<HTMLElement>(".cv, img");
      if (!anchor || !name || !cover || (anchor.target && anchor.target !== "_self")) return;
      flight = { name, rect: cover.getBoundingClientRect(), at: performance.now() };
    }

    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!flight) return;
    const frame = requestAnimationFrame(() => {
      const current = flight;
      if (!current) return;
      if (performance.now() - current.at > FLIGHT_TTL) {
        flight = null;
        return;
      }
      const target =
        document.querySelector<HTMLElement>(`[data-cover="${current.name}"]`) ??
        document.querySelector<HTMLElement>("[data-vt-target]");
      // Not on screen yet: keep the flight for the next commit.
      if (!target) return;
      flight = null;
      if (prefersReducedMotion()) return;

      const to = target.getBoundingClientRect();
      if (to.width === 0 || to.height === 0) return;
      const dx = current.rect.left - to.left;
      const dy = current.rect.top - to.top;
      const sx = current.rect.width / to.width;
      const sy = current.rect.height / to.height;
      target.animate(
        [
          { transformOrigin: "top left", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: "top left", transform: "none" },
        ],
        { duration: durDrawer, easing: easeInOut },
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
