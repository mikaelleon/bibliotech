import { BookCard } from "@/components/book-card";
import { CardFavorite } from "@/components/card-favorite";
import { bookGridClass } from "@/lib/book-grid-class";
import { listFavoriteIds } from "@/lib/records";
import { getSession } from "@/lib/session";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

export { bookGridClass };

/** One card style: cover, title, author, category, and a heart. */
export async function BookGrid({
  books,
  showCategory = true,
  className,
}: {
  books: Book[];
  showCategory?: boolean;
  className?: string;
}) {
  const session = await getSession();
  const signedIn = session.kind === "user";
  const favoriteIds = signedIn ? await listFavoriteIds(session.email) : [];

  return (
    <ul className={cn(bookGridClass, "stagger", className)}>
      {books.map((book) => (
        <li key={book.id} className="min-w-0">
          <BookCard
            book={book}
            showCategory={showCategory}
            corner={<CardFavorite bookId={book.id} active={favoriteIds.includes(book.id)} signedIn={signedIn} />}
          />
        </li>
      ))}
    </ul>
  );
}
