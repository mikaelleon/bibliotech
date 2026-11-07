"use client";

import { useLayoutEffect, useRef } from "react";

import { durMove, easeInOut, prefersReducedMotion } from "@/lib/motion";

/**
 * One indicator per nav group that slides to the active item ("reuse the same layoutId").
 * Mark the active target with `data-indicator-target="true"`. The indicator stretches 12% along
 * the direction of travel while it moves, then settles.
 */
export function useIndicator<T extends HTMLElement>(activeKey: string | undefined) {
  const containerRef = useRef<T>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  // Hydration can change the active item right after mount. Only slide for changes after that.
  const mountedAt = useRef<number | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;
    mountedAt.current ??= performance.now();

    function place(animate: boolean) {
      if (!container || !indicator) return;
      const target = container.querySelector<HTMLElement>('[data-indicator-target="true"]');
      if (!target) {
        indicator.style.opacity = "0";
        return;
      }
      const box = container.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const x = rect.left - box.left + container.scrollLeft;
      const y = rect.top - box.top + container.scrollTop;
      const settled = performance.now() - (mountedAt.current ?? 0) > 300;
      const moveIt = animate && placed.current && settled && !prefersReducedMotion();

      if (!moveIt) indicator.style.transition = "none";
      indicator.style.width = `${rect.width}px`;
      indicator.style.height = `${rect.height}px`;
      indicator.style.translate = `${x}px ${y}px`;
      indicator.style.opacity = "1";

      if (!moveIt) {
        void indicator.offsetWidth;
        indicator.style.transition = "";
      } else if (last.current) {
        const dx = x - last.current.x;
        const dy = y - last.current.y;
        if (dx !== 0 || dy !== 0) {
          const stretch = Math.abs(dx) >= Math.abs(dy) ? "1.12 1" : "1 1.12";
          indicator.animate([{ scale: "1 1" }, { scale: stretch }, { scale: "1 1" }], {
            duration: durMove,
            easing: easeInOut,
          });
        }
      }
      placed.current = true;
      last.current = { x, y };
    }

    place(true);

    const observer = new ResizeObserver(() => place(false));
    observer.observe(container);
    return () => observer.disconnect();
  }, [activeKey]);

  return { containerRef, indicatorRef };
}
