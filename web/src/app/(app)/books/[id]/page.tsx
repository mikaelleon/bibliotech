import { ArrowLeft, Bookmark, Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookCard } from "@/components/book-card";
import { BookCover } from "@/components/book-cover";
import { DefinitionList } from "@/components/definition-list";
import { Button } from "@/components/ui/button";
import { getBook, relatedBooks } from "@/lib/books";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBook(id);
  return { title: book?.title ?? "Book" };
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBook(id);
  if (!book) notFound();

  const more = relatedBooks(book);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pt-2 pb-6 md:px-8 md:py-8">
      <Link href="/browse" className="inline-flex min-h-11 items-center gap-2 text-sm leading-5 text-muted-foreground no-underline">
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
        Back to Browse
      </Link>

      <div className="mt-2 flex flex-col items-start gap-6 md:mt-4 md:flex-row md:gap-12">
        <div className="w-48 shrink-0 md:w-[280px]">
          <BookCover book={book} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="serif text-[32px] leading-10 md:text-[40px] md:leading-[46px]">{book.title}</h1>
          <p className="mt-1 text-muted-foreground md:text-xl md:leading-7">{book.author}</p>
          <DefinitionList
            className="mt-4 md:mt-6"
            items={[
              { term: "Category", value: book.category },
              { term: "Language", value: book.language },
              { term: "License", value: book.license },
              {
                term: "Source",
                value: (
                  <a
                    href={book.sourceUrl}
                    className="text-brand-text underline underline-offset-4"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {book.sourceName}
                  </a>
                ),
              },
            ]}
          />
          <p className="mt-4 max-w-[640px] text-sm leading-5 md:mt-8 md:text-base md:leading-normal">
            {book.summaryShort ? (
              <>
                <span className="md:hidden">{book.summaryShort}</span>
                <span className="hidden md:inline">{book.summary}</span>
              </>
            ) : (
              book.summary
            )}
          </p>
          <div className="mt-6 md:mt-8">
            <div className="grid gap-2 md:flex md:flex-wrap">
              <Button type="button" disabled aria-describedby="phase-note" className="w-full md:w-auto">
                <Download strokeWidth={1.5} />
                Download
              </Button>
              <Button type="button" variant="outline" disabled aria-describedby="phase-note" className="w-full md:w-auto">
                <Bookmark strokeWidth={1.5} />
                Save to Library
              </Button>
            </div>
            <p id="phase-note" className="mt-2 text-sm leading-5 text-muted-foreground">
              Downloads arrive in Phase 2.
            </p>
          </div>
        </div>
      </div>

      {more.length > 0 ? (
        <section className="mt-16 hidden md:block" aria-label={`More in ${book.category}`}>
          <h2 className="serif text-2xl leading-8">More in {book.category}</h2>
          <ul className="mt-6 grid max-w-[960px] grid-cols-5 gap-6">
            {more.map((item) => (
              <li key={item.id}>
                <BookCard book={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
