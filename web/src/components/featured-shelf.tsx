"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

import { FavoriteButton } from "@/components/favorite-button";
import { BookCard } from "@/components/book-card";
import { DefinitionList } from "@/components/definition-list";
import { Button } from "@/components/ui/button";
import { prefersReducedMotion } from "@/lib/motion";
import { displayTitle } from "@/lib/title";
import { useHoverIntent } from "@/lib/use-hover-intent";
import type { Book } from "@/lib/types";

/**
 * One large focal cover and its neighbors. Arrows on either side of the shelf move the focal book.
 * When the section is wide enough, a preview panel fills the right side: it shows the hovered or
 * focused cover, and falls back to the focal book when the pointer leaves the shelf.
 */
export function FeaturedShelf({ books }: { books: Book[] }) {
  const [index, setIndex] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const shelfRef = useRef<HTMLUListElement>(null);
  const hoverIntent = useHoverIntent<string>(setPreviewId);

  if (books.length === 0) return null;

  const focal = books[Math.min(index, books.length - 1)];
  const neighbors = books.slice(index + 1, index + 4);
  const preview = books.find((book) => book.id === previewId) ?? focal;

  /**
   * Step the shelf. Covers glide to their new slots (and the focal one grows) in a view transition.
   * Each cover gets a view-transition-name only for this step, so page and theme transitions stay unaffected.
   */
  function move(step: number) {
    const next = Math.min(books.length - 1, Math.max(0, index + step));
    if (next === index) return;
    hoverIntent.cancel();
    const update = () =>
      flushSync(() => {
        setPreviewId(null);
        setIndex(next);
      });

    const shelf = shelfRef.current;
    if (!shelf || !("startViewTransition" in document) || prefersReducedMotion()) {
      update();
      return;
    }

    const name = () =>
      shelf.querySelectorAll<HTMLElement>("li[data-book]").forEach((item) => {
        item.style.viewTransitionName = `shelf-${item.dataset.book}`;
      });
    name();
    const transition = document.startViewTransition(() => {
      update();
      name();
    });
    void transition.finished.finally(() =>
      shelf.querySelectorAll<HTMLElement>("li[data-book]").forEach((item) => {
        item.style.viewTransitionName = "";
      }),
    );
  }

  /**
   * Keyboard focus previews at once. The pointer waits 80ms, so sweeping across the shelf
   * doesn't flick the panel through every cover on the way.
   */
  function previewProps(book: Book) {
    return {
      "data-book": book.id,
      onMouseEnter: () => hoverIntent.enter(book.id),
      onMouseLeave: hoverIntent.cancel,
      onFocus: () => setPreviewId(book.id),
    };
  }

  return (
    // Container query, not a viewport breakpoint: the side rail and page padding eat into the width,
    // so the panel shows whenever the section itself has room for the shelf plus the panel.
    <div className="@container">
      <section
        aria-labelledby="featured-heading"
        className="@min-[1000px]:grid @min-[1000px]:grid-cols-[minmax(0,1fr)_320px] @min-[1000px]:items-start @min-[1000px]:gap-8"
      >
        <div className="@container/shelf min-w-0">
          <div className="max-w-xl">
            <h1 id="featured-heading" className="page-title">
              Featured books
            </h1>
            <Button asChild className="mt-4 h-auto w-full max-w-xl min-h-11 py-2 md:mt-6">
              <Link href={`/books/${focal.id}`} aria-label={`View ${focal.title}`}>
                <span className="line-clamp-2 min-w-0 flex-1 text-left">View {displayTitle(focal.title)}</span>
                <ArrowRight strokeWidth={1.5} />
              </Link>
            </Button>
          </div>

          <div className="mt-6 flex items-start gap-4 md:mt-8">
            <ShelfArrow direction="previous" disabled={index === 0} onClick={() => move(-1)} />

            <ul
              ref={shelfRef}
              // Phones: the covers share the width (10:7:7), so the shelf never scrolls sideways.
              // From md the covers have fixed sizes and the arrows hug the shelf.
              className="flex min-w-0 flex-1 items-start gap-4 md:flex-initial md:gap-6"
              data-guest-shelf
              onMouseLeave={() => {
                hoverIntent.cancel();
                setPreviewId(null);
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPreviewId(null);
              }}
            >
              <li key={focal.id} className="min-w-0 flex-[10_1_0%] md:w-48 md:flex-none" {...previewProps(focal)}>
                <BookCard
                  book={focal}
                  corner={<FavoriteButton bookId={focal.id} title={focal.title} />}
                />
              </li>
              {neighbors.map((book, neighborIndex) => (
                <li
                  key={book.id}
                  // The third neighbor needs 768px: two 44px arrows, the 192px focal cover, three 128px
                  // covers, and the gaps. A narrower shelf column drops it instead of scrolling.
                  className={
                    neighborIndex > 1
                      ? "hidden w-32 shrink-0 @min-[768px]/shelf:block"
                      : "min-w-0 flex-[7_1_0%] md:w-32 md:flex-none"
                  }
                  {...previewProps(book)}
                >
                  <BookCard
                    book={book}
                    corner={<FavoriteButton bookId={book.id} title={book.title} />}
                  />
                </li>
              ))}
            </ul>

            <ShelfArrow direction="next" disabled={index >= books.length - 1} onClick={() => move(1)} />
          </div>
        </div>

        <BookPreview book={preview} />
      </section>
    </div>
  );
}

/**
 * Arrow beside the shelf, centered on the focal cover (w-48 at 2:3 is 288px tall, so 144px down,
 * minus half the 44px button). Phones swipe the shelf instead, so the arrows start at md.
 */
function ShelfArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <Button
      type="button"
      variant="outline"
      className="mt-[122px] hidden size-11 shrink-0 px-0 md:inline-flex"
      aria-label={direction === "previous" ? "Previous book" : "Next book"}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={20} strokeWidth={1.5} />
    </Button>
  );
}

/** Details for the previewed book. Hidden until the section is wide enough for a second column. */
function BookPreview({ book }: { book: Book }) {
  return (
    <aside aria-label="Book preview" className="hidden min-w-0 border-l border-border pl-8 @min-[1000px]:block">
      <div key={book.id} className="swap-in">
        <p className="text-xs leading-4 font-medium tracking-wide text-muted-foreground uppercase">
          {book.category}
          {book.published ? ` · ${book.published}` : null}
        </p>
        <h2 className="serif mt-3 line-clamp-4 text-[32px] leading-10" title={book.title}>{displayTitle(book.title)}</h2>
        <p className="mt-1 text-muted-foreground">{book.author}</p>

        <p className="mt-6 line-clamp-6 text-sm leading-6">{book.summary}</p>

        <DefinitionList
          className="mt-6"
          items={[
            ...(book.published ? [{ term: "Published", value: book.published }] : []),
            { term: "Category", value: book.category },
            { term: "Language", value: book.language },
            { term: "License", value: book.license },
            { term: "Source", value: book.sourceName },
          ]}
        />

        <Link
          href={`/books/${book.id}`}
          className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm leading-5 font-medium text-brand-text underline-offset-4 hover:underline"
        >
          Open book page
          <ArrowRight size={16} strokeWidth={1.5} />
        </Link>
      </div>
    </aside>
  );
}
