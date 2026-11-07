import { BookCard } from "@/components/book-card";
import { FavoriteButton } from "@/components/favorite-button";
import { LibraryButton } from "@/components/library-button";
import { bookGridClass } from "@/lib/book-grid-class";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

export { bookGridClass };

/**
 * One card style: cover, title, author, category, and one corner control.
 * `control="favorite"` (default) is the heart; `control="library"` is the Library bookmark, used on
 * the Library page so the card's control acts on Library. Both read the shared shelf, so this
 * component no longer reads favorites on the server for every grid.
 */
export function BookGrid({
  books,
  showCategory = true,
  className,
  control = "favorite",
}: {
  books: Book[];
  showCategory?: boolean;
  className?: string;
  control?: "favorite" | "library";
}) {
  return (
    <ul className={cn(bookGridClass, "stagger", className)}>
      {books.map((book) => (
        <li key={book.id} className="min-w-0">
          <BookCard
            book={book}
            showCategory={showCategory}
            corner={
              control === "library" ? (
                <LibraryButton bookId={book.id} title={book.title} />
              ) : (
                <FavoriteButton bookId={book.id} title={book.title} />
              )
            }
          />
        </li>
      ))}
    </ul>
  );
}
