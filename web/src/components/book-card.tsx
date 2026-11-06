import Link from "next/link";

import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/types";

/** The whole card is one link: cover, title, author, and an optional category line. */
export function BookCard({
  book,
  showCategory = false,
  href,
}: {
  book: Book;
  showCategory?: boolean;
  href?: string;
}) {
  return (
    <Link href={href ?? `/books/${book.id}`} className="block text-inherit no-underline">
      <BookCover book={book} decorative />
      <p className="mt-3 text-sm leading-5 font-medium">{book.title}</p>
      <p className="text-sm leading-5 text-muted-foreground">{book.author}</p>
      {showCategory ? <p className="text-xs leading-4 text-muted-foreground">{book.category}</p> : null}
    </Link>
  );
}
