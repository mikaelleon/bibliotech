"use client";

import { Heart } from "lucide-react";
import { useRef } from "react";

import { useShelf } from "@/components/shelf-provider";
import { Swap } from "@/components/swap";
import { durConfirm, easeOut, prefersReducedMotion } from "@/lib/motion";

/**
 * Heart on a book card. Reads the shared shelf, so every heart for the same book agrees.
 * The label is fixed ("Favorite …") and `aria-pressed` carries the state, so screen readers hear it once.
 * Guests get the same heart; pressing it explains what an account adds.
 */
export function FavoriteButton({ bookId, title }: { bookId: string; title: string }) {
  const shelf = useShelf();
  const on = shelf.signedIn && shelf.has("favorites", bookId);
  const iconRef = useRef<HTMLSpanElement>(null);

  function press() {
    if (!shelf.signedIn) {
      shelf.promptSignUp("favorites");
      return;
    }
    if (!on && !prefersReducedMotion()) {
      iconRef.current?.animate([{ scale: 1 }, { scale: 1.15 }, { scale: 1 }], { duration: durConfirm, easing: easeOut });
    }
    void shelf.set("favorites", bookId, !on);
  }

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`Favorite ${title}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        press();
      }}
      className="press inline-flex size-11 items-center justify-center rounded-full border border-border bg-card"
    >
      <span ref={iconRef} className="inline-flex">
        <Swap
          blur
          index={on ? 1 : 0}
          items={[
            <Heart key="off" size={20} strokeWidth={1.5} className="text-foreground" aria-hidden />,
            <Heart key="on" size={20} strokeWidth={1.5} className="fill-foreground text-foreground" aria-hidden />,
          ]}
        />
      </span>
    </button>
  );
}
