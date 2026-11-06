"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BookCard } from "@/components/book-card";
import { Button } from "@/components/ui/button";
import type { Book } from "@/lib/types";

/** One large focal cover and its neighbors. Arrows move the focal book. */
export function FeaturedShelf({ books }: { books: Book[] }) {
  const [index, setIndex] = useState(0);
  if (books.length === 0) return null;

  const focal = books[Math.min(index, books.length - 1)];
  const neighbors = books.slice(index + 1, index + 4);

  return (
    <section className="md:rounded-xl md:border md:border-border md:bg-card md:p-8" aria-labelledby="featured-heading">
      <div className="max-w-xl">
        <h1 id="featured-heading" className="serif text-[32px] leading-10 md:text-[40px] md:leading-[46px]">
          Public-domain books, free to read and download.
        </h1>
        <p className="mt-2 text-sm leading-5 text-muted-foreground md:mt-3 md:text-base md:leading-normal">
          Every title comes from Project Gutenberg, so it is legal to keep.
        </p>
        <Button asChild className="mt-4 md:mt-6">
          <Link href={`/books/${focal.id}`}>
            View {focal.title}
            <ArrowRight strokeWidth={1.5} />
          </Link>
        </Button>
      </div>

      <ul className="mt-6 flex items-start gap-4 overflow-x-auto md:mt-8 md:gap-6">
        <li className="w-40 shrink-0 md:w-48">
          <BookCard book={focal} />
        </li>
        {neighbors.map((book, neighborIndex) => (
          <li
            key={book.id}
            className={neighborIndex > 1 ? "hidden w-28 shrink-0 md:block md:w-32" : "w-28 shrink-0 md:w-32"}
          >
            <BookCard book={book} />
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-4 md:mt-6">
        <div className="hidden gap-2 md:flex">
          <Button
            type="button"
            variant="outline"
            className="size-11 px-0"
            aria-label="Previous book"
            disabled={index === 0}
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="size-11 px-0"
            aria-label="Next book"
            disabled={index >= books.length - 1}
            onClick={() => setIndex((current) => Math.min(books.length - 1, current + 1))}
          >
            <ChevronRight size={20} strokeWidth={1.5} />
          </Button>
        </div>
        <p className="text-sm leading-5 text-brand-text">
          {index + 1} / {books.length} books
        </p>
      </div>
    </section>
  );
}
