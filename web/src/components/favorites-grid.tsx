"use client";

import { useState } from "react";

import { BookCard } from "@/components/book-card";
import { FavoriteButton } from "@/components/favorite-button";
import { useToast } from "@/components/toast";
import { toggleFavoriteAction } from "@/lib/actions";
import type { Book } from "@/lib/types";

export function FavoritesGrid({ books }: { books: Book[] }) {
  const { toast } = useToast();
  const [items, setItems] = useState(books);

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
      {items.map((book) => (
        <li key={book.id}>
          <BookCard
            book={book}
            corner={
              <FavoriteButton
                bookId={book.id}
                active
                overlay
                onChange={(active) => {
                  if (active) {
                    setItems((current) =>
                      current.some((item) => item.id === book.id) ? current : [book, ...current],
                    );
                    return;
                  }
                  setItems((current) => current.filter((item) => item.id !== book.id));
                  toast("Removed from favorites.", {
                    label: "Undo",
                    onClick: () => {
                      setItems((current) => [book, ...current.filter((item) => item.id !== book.id)]);
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
  );
}
