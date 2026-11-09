"use client";

import { Download } from "lucide-react";

import { FavoriteButton } from "@/components/favorite-button";
import { cn } from "@/lib/utils";

/** Heart and download mark for a cover, in the same corner as Browse. */
export function BookMarks({
  bookId,
  title,
  downloaded,
}: {
  bookId: string;
  title: string;
  downloaded: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-2">
      <FavoriteButton bookId={bookId} title={title} />
      <span
        aria-label={downloaded ? `${title} is on this device` : `${title} is not on this device`}
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-full border",
          downloaded
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-card text-muted-foreground",
        )}
      >
        <Download size={20} strokeWidth={1.5} aria-hidden />
      </span>
    </div>
  );
}
