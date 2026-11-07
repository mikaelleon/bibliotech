"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { BookCard } from "@/components/book-card";
import { FavoriteButton } from "@/components/favorite-button";
import { useToast } from "@/components/toast";
import { bookGridClass } from "@/lib/book-grid-class";
import { toggleFavoriteAction } from "@/lib/actions";
import { durPanelExit } from "@/lib/motion";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Favorites with Undo. A removed card fades and shrinks out. When the last one goes, the empty
 * state fades in while that card is still leaving, so the two overlap. Undo reverses both.
 */
export function FavoritesGrid({ books, empty }: { books: Book[]; empty: ReactNode }) {
  const { toast } = useToast();
  const [items, setItems] = useState(books);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [entering, setEntering] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const later = (run: () => void) => {
    timers.current.push(window.setTimeout(run, durPanelExit));
  };

  function remove(book: Book) {
    setLeaving((ids) => [...ids, book.id]);
    later(() => {
      setItems((current) => current.filter((item) => item.id !== book.id));
      setLeaving((ids) => ids.filter((id) => id !== book.id));
    });
  }

  function restore(book: Book) {
    setLeaving((ids) => ids.filter((id) => id !== book.id));
    setEntering((ids) => [...ids, book.id]);
    setItems((current) => [book, ...current.filter((item) => item.id !== book.id)]);
  }

  const staying = items.filter((item) => !leaving.includes(item.id));
  const showEmpty = staying.length === 0;

  return (
    <div className="grid [&>*]:[grid-area:1/1]">
      {items.length > 0 ? (
        <ul className={cn(bookGridClass, "self-start")}>
          {items.map((book) => (
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
                corner={
                  <FavoriteButton
                    bookId={book.id}
                    active
                    overlay
                    onChange={(active) => {
                      if (active) {
                        restore(book);
                        return;
                      }
                      remove(book);
                      toast("Removed from favorites", {
                        label: "Undo",
                        onClick: () => {
                          restore(book);
                          void toggleFavoriteAction(book.id);
                        },
                      });
                    }}
                  />
                }
              />
            </li>
          ))}
        </ul>
      ) : null}
      {showEmpty ? <div className="page-enter grid gap-8 self-start">{empty}</div> : null}
    </div>
  );
}
