import { BookCard } from "@/components/book-card";
import { CardFavorite } from "@/components/card-favorite";
import { listFavoriteIds } from "@/lib/records";
import { getSession } from "@/lib/session";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

export const bookGridClass =
  "grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]";

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
