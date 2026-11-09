"use client";

import { useEffect, useState, type ReactNode } from "react";

import { BookCard } from "@/components/book-card";
import { FavoriteButton } from "@/components/favorite-button";
import { useShelf, type Shelf } from "@/components/shelf-provider";
import { bookGridClass } from "@/lib/book-grid-class";
import { durPanelExit } from "@/lib/motion";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The Favorites or Library page grid. It follows the shared shelf: a removed card fades and shrinks
 * out, Undo brings it back in its old slot, and when the last one goes the empty state fades in
 * while that card is still leaving. The card control matches the page (heart on Favorites,
 * bookmark on Library). The Library card shows a heart and a download mark.
 */
export function ShelfGrid({
  shelf: kind,
  books,
  empty,
  selecting = false,
  selected,
  onToggle,
}: {
  shelf: Shelf;
  books: Book[];
  empty: ReactNode;
  selecting?: boolean;
  selected?: ReadonlySet<string>;
  onToggle?: (id: string) => void;
}) {
  const shelf = useShelf();
  // Every book this page has shown, in page order, so an Undo returns a card to the same slot.
  const [known, setKnown] = useState(books);
  const [seenBooks, setSeenBooks] = useState(books);
  if (books !== seenBooks) {
    setSeenBooks(books);
    setKnown((current) => [...books, ...current.filter((book) => !books.some((item) => item.id === book.id))]);
  }

  // Cards that just left the shelf stay for the length of their exit.
  const present = known.filter((book) => shelf.has(kind, book.id)).map((book) => book.id);
  const [shown, setShown] = useState(present);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [entering, setEntering] = useState<string[]>([]);
  const presentKey = present.join(",");
  if (presentKey !== shown.join(",")) {
    const gone = shown.filter((id) => !present.includes(id));
    const back = present.filter((id) => !shown.includes(id));
    setShown(present);
    if (gone.length) setLeaving((ids) => [...ids.filter((id) => !back.includes(id)), ...gone]);
    if (back.length) {
      setLeaving((ids) => ids.filter((id) => !back.includes(id)));
      setEntering((ids) => [...ids, ...back]);
    }
  }

  useEffect(() => {
    if (leaving.length === 0) return;
    const timer = window.setTimeout(() => setLeaving([]), durPanelExit);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  const visible = known.filter((book) => present.includes(book.id) || leaving.includes(book.id));

  return (
    <div className="grid [&>*]:[grid-area:1/1]">
      {visible.length > 0 ? (
        <ul className={cn(bookGridClass, "self-start")}>
          {visible.map((book) => (
            <li
              key={book.id}
              className={cn(
                "min-w-0",
                leaving.includes(book.id) && "item-leave",
                entering.includes(book.id) && "page-enter",
              )}
            >
              <BookCard
                book={book}
                showCategory
                selecting={selecting}
                selected={selected?.has(book.id)}
                onToggleSelect={() => onToggle?.(book.id)}
                corner={selecting ? undefined : <FavoriteButton bookId={book.id} title={book.title} />}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {present.length === 0 ? <div className="page-enter grid gap-8 self-start">{empty}</div> : null}
    </div>
  );
}

/** Live count for the page header: "5 favorites", "3 books in your Library". */
export function ShelfCount({ shelf: kind }: { shelf: Shelf }) {
  const shelf = useShelf();
  const count = shelf.count(kind);
  if (kind === "favorites") return <>{count === 1 ? "1 favorite" : `${count} favorites`}</>;
  return <>{count === 1 ? "1 book in your Library" : `${count} books in your Library`}</>;
}
