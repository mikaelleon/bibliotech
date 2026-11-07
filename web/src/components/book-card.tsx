import Link from "next/link";
import type { ReactNode } from "react";

import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/types";

/**
 * The whole card is one link: cover, title, author, and an optional category line.
 * `data-vt-cover` lets the view transition morph this cover into the detail cover.
 */
export function BookCard({
  book,
  showCategory = false,
  href,
  corner,
}: {
  book: Book;
  showCategory?: boolean;
  href?: string;
  corner?: ReactNode;
}) {
  const destination = href ?? `/books/${book.id}`;

  return (
    <div className="relative min-w-0">
      <Link
        href={destination}
        data-vt-cover={`book-${book.id}`}
        className="press-card block min-w-0 text-inherit no-underline"
      >
        <BookCover book={book} decorative />
        <p className="mt-3 text-sm leading-5 font-medium break-words">{book.title}</p>
        <p className="text-sm leading-5 text-muted-foreground">{book.author}</p>
        {showCategory ? <p className="text-xs leading-4 text-muted-foreground">{book.category}</p> : null}
      </Link>
      {corner ? <div className="absolute top-2 right-2">{corner}</div> : null}
    </div>
  );
}
