"use client";

import { Heart } from "lucide-react";
import { useRef } from "react";

import { AddToLibrary } from "@/components/add-to-library";
import { useShelf } from "@/components/shelf-provider";
import { Swap } from "@/components/swap";
import { durConfirm, easeOut, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The book page's action row: Library and Favorite, as two labelled toggle buttons.
 *
 * - Add to Library ↔ In Library. A shelf of books to come back to. It never uses a download.
 * - Favorite ↔ Favorited. Books the reader loves.
 * Each keeps its width while its label changes. The visible label states the state ("In Library",
 * "Favorited"), so these are not aria-pressed toggles: that would announce the state twice.
 * Guests see both; pressing one explains the account.
 * Download joins this row when downloads exist; for accounts, a download will also add to Library.
 */
export function BookActions({ bookId }: { bookId: string }) {
  const shelf = useShelf();
  const favorite = shelf.signedIn && shelf.has("favorites", bookId);
  const heartRef = useRef<HTMLSpanElement>(null);

  function toggleFavorite() {
    if (!shelf.signedIn) return shelf.promptSignUp("favorites");
    if (!favorite && !prefersReducedMotion()) {
      heartRef.current?.animate([{ scale: 1 }, { scale: 1.15 }, { scale: 1 }], { duration: durConfirm, easing: easeOut });
    }
    void shelf.set("favorites", bookId, !favorite);
  }

  const base =
    "press inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm leading-5 font-medium";

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Save this book">
      <AddToLibrary bookId={bookId} title="this book" appearance="label" />
      <button
        type="button"
        aria-label={favorite ? "Favorited" : "Favorite"}
        onClick={toggleFavorite}
        className={cn(base, "border-border bg-card text-foreground hover:bg-background")}
      >
        <span ref={heartRef} className="inline-flex">
          <Swap
            blur
            index={favorite ? 1 : 0}
            items={[
              <Heart key="off" size={16} strokeWidth={1.5} aria-hidden />,
              <Heart key="on" size={16} strokeWidth={1.5} className="fill-foreground" aria-hidden />,
            ]}
          />
        </span>
        <Swap index={favorite ? 1 : 0} items={["Favorite", "Favorited"]} />
      </button>
    </div>
  );
}
