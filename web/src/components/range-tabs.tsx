"use client";

import Link from "next/link";

import { useIndicator } from "@/lib/use-indicator";
import { cn } from "@/lib/utils";

/** Date range for Analytics. One indicator slides to the selected range. */
export function RangeTabs({ ranges, days }: { ranges: readonly number[]; days: number }) {
  const { containerRef, indicatorRef } = useIndicator<HTMLElement>(String(days));

  return (
    <nav ref={containerRef} aria-label="Date range" className="relative isolate flex gap-2">
      <span ref={indicatorRef} aria-hidden className="nav-indicator -z-10 rounded-xl bg-primary opacity-0" />
      {ranges.map((value) => {
        const current = value === days;
        return (
          <Link
            key={value}
            href={value === 30 ? "/admin/analytics" : `/admin/analytics?range=${value}`}
            aria-current={current ? "page" : undefined}
            data-indicator-target={current}
            className={cn(
              "press relative inline-flex h-11 items-center rounded-xl px-4 text-sm leading-5 font-medium no-underline",
              current
                ? "text-primary-foreground"
                : "text-foreground before:absolute before:inset-0 before:-z-20 before:rounded-xl before:bg-card before:transition-colors before:duration-[var(--dur-hover)] hover:before:bg-border",
            )}
          >
            {value} days
          </Link>
        );
      })}
    </nav>
  );
}
