"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Book summary. On phones a long summary is clamped to four lines with a fade, and "Read more"
 * reveals the rest with a mask that sweeps down. Desktop always shows the full text.
 */
export function BookSummary({ summary, long }: { summary: string; long: boolean }) {
  const [open, setOpen] = useState(false);
  const clamped = long && !open;

  return (
    <div className="mt-4 max-w-[640px] md:mt-8">
      <p
        className={cn(
          "text-sm leading-5 md:text-base md:leading-6",
          clamped && "summary-clamped",
          open && "summary-open",
        )}
      >
        {summary}
      </p>
      {long ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="press mt-1 min-h-11 text-sm leading-5 text-brand-text underline md:hidden"
        >
          {open ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}
