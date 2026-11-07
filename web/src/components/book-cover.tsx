import { coverColors } from "@/lib/cover";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BookCover({
  book,
  className,
  decorative = false,
  transitionName,
}: {
  book: Book;
  className?: string;
  /** Inside a card the link already names the book, so the cover stays unlabeled. */
  decorative?: boolean;
  /** Marks the book page cover as the landing spot of the card-to-cover morph (components/view-transitions.tsx). */
  transitionName?: string;
}) {
  const label = `Cover of ${book.title} by ${book.author}`;

  if (book.coverUrl) {
    return (
      // Covers use container-query type. next/image cannot size that text treatment.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={book.coverUrl}
        alt={decorative ? "" : label}
        aria-hidden={decorative || undefined}
        className={cn("aspect-[2/3] w-full rounded-sm object-cover shadow-[var(--shadow-cover)]", className)}
        data-cover={transitionName}
      />
    );
  }

  const colors = coverColors(book.id);
  return (
    <div
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={cn("cv", className)}
      data-cover={transitionName}
      style={{ background: colors.background, color: colors.color }}
    >
      <span className="ct">{book.title}</span>
      <span className="ca">{book.author}</span>
    </div>
  );
}
