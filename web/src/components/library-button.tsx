"use client";

import { BookmarkCheck, BookmarkPlus } from "lucide-react";

import { useShelf } from "@/components/shelf-provider";
import { Swap } from "@/components/swap";

/**
 * Bookmark on a Library card. On the Library page the card's control must act on Library,
 * not Favorites: a heart there read as "remove from Library" and didn't do it.
 */
export function LibraryButton({ bookId, title }: { bookId: string; title: string }) {
  const shelf = useShelf();
  const on = shelf.signedIn && shelf.has("library", bookId);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`Keep ${title} in Library`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!shelf.signedIn) shelf.promptSignUp("library");
        else void shelf.set("library", bookId, !on);
      }}
      className="press inline-flex size-11 items-center justify-center rounded-full border border-border bg-card"
    >
      <Swap
        blur
        index={on ? 1 : 0}
        items={[
          <BookmarkPlus key="off" size={20} strokeWidth={1.5} aria-hidden />,
          <BookmarkCheck key="on" size={20} strokeWidth={1.5} className="fill-foreground text-foreground [&>path:last-child]:stroke-card" aria-hidden />,
        ]}
      />
    </button>
  );
}
