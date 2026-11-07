"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/types";

/** The whole card is one link: cover, title, author, and an optional category line. */
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
  const router = useRouter();
  const destination = href ?? `/books/${book.id}`;

  function openBook(event: MouseEvent<HTMLAnchorElement>) {
    const cover = event.currentTarget.querySelector(".cv, img");
    if (cover instanceof HTMLElement) cover.style.viewTransitionName = `book-${book.id}`;
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    if (modified || !("startViewTransition" in document)) return;
    event.preventDefault();
    document.startViewTransition(() => {
      router.push(destination);
    });
  }

  return (
    <div className="relative min-w-0">
      <Link href={destination} className="press-card block min-w-0 text-inherit no-underline" onClick={openBook}>
        <BookCover book={book} decorative />
        <p className="mt-3 text-sm leading-5 font-medium break-words">{book.title}</p>
        <p className="text-sm leading-5 text-muted-foreground">{book.author}</p>
        {showCategory ? <p className="text-xs leading-4 text-muted-foreground">{book.category}</p> : null}
      </Link>
      {corner ? <div className="absolute top-2 right-2">{corner}</div> : null}
    </div>
  );
}
