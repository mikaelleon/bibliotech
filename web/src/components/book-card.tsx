import Link from "next/link";
import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The whole card is one link: cover, title, author, and an optional category line.
 * `data-vt-cover` lets the view transition morph this cover into the detail cover.
 */
export function BookCard({
  book,
  showCategory = false,
  href,
  corner,
  extra,
  selecting = false,
  selected = false,
  onToggleSelect,
}: {
  book: Book;
  showCategory?: boolean;
  href?: string;
  corner?: ReactNode;
  extra?: ReactNode;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const destination = href ?? `/books/${book.id}`;
  const body = (
    <>
      <BookCover book={book} decorative />
      <p className="mt-3 text-sm leading-5 font-medium break-words">{book.title}</p>
      <p className="text-sm leading-5 text-muted-foreground">{book.author}</p>
      {showCategory ? <p className="text-xs leading-4 text-muted-foreground">{book.category}</p> : null}
      {extra}
    </>
  );

  return (
    <div className={cn("relative min-w-0 rounded-xl", selecting && selected && "ring-2 ring-foreground")}>
      {selecting ? (
        <button
          type="button"
          aria-pressed={selected}
          aria-label={`${selected ? "Deselect" : "Select"} ${book.title}`}
          onClick={onToggleSelect}
          className="press-card block w-full min-w-0 text-left text-inherit"
        >
          {body}
        </button>
      ) : (
        <Link
          href={destination}
          data-vt-cover={`book-${book.id}`}
          className="press-card block min-w-0 text-inherit no-underline"
        >
          {body}
        </Link>
      )}
      {selecting ? (
        <span
          aria-hidden
          className={cn(
            "absolute top-2 left-2 inline-flex size-6 items-center justify-center rounded-full border",
            selected ? "border-foreground bg-foreground text-background" : "border-border bg-card",
          )}
        >
          {selected ? <Check size={14} strokeWidth={2} /> : null}
        </span>
      ) : null}
      {corner && !selecting ? <div className="absolute top-2 right-2">{corner}</div> : null}
    </div>
  );
}
