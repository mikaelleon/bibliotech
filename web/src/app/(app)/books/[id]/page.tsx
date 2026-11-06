import { ArrowLeft, Bookmark, Download, Info } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Banner } from "@/components/banner";
import { BookCard } from "@/components/book-card";
import { BookCover } from "@/components/book-cover";
import { DefinitionList } from "@/components/definition-list";
import { FavoriteButton } from "@/components/favorite-button";
import { Button } from "@/components/ui/button";
import { getBook, relatedBooks } from "@/lib/books";
import { isFavorite } from "@/lib/records";
import { getSession } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBook(id);
  return { title: book?.title ?? "Book" };
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBook(id);
  if (!book) notFound();

  const session = await getSession();
  const more = relatedBooks(book);
  const saved = session.kind === "user" ? await isFavorite(session.email, book.id) : false;
  const guestLeft = 5;
  const used = session.kind === "user" ? session.downloadsUsed : 0;

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
          <h1 className="serif text-[32px] leading-10 font-light md:text-[40px] md:leading-[46px]">{book.title}</h1>
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
          <p className="mt-4 max-w-[640px] text-sm leading-5 md:mt-8 md:text-base md:leading-6">
            {book.summaryShort ? (
              <>
                <span className="md:hidden">{book.summaryShort}</span>
                <span className="hidden md:inline">{book.summary}</span>
              </>
            ) : (
              book.summary
            )}
          </p>
          <div className="mt-6 grid gap-4 md:mt-8">
            {session.kind === "guest" ? (
              <Banner icon={<Info size={20} strokeWidth={1.5} aria-hidden />}>
                {guestLeft} of 5 downloads left. Create a free account for 10.{" "}
                <Link href="/register" className="text-brand-text underline underline-offset-4">
                  Register
                </Link>
              </Banner>
            ) : null}
            {session.kind === "user" ? (
              <Banner icon={<Info size={20} strokeWidth={1.5} aria-hidden />}>
                {used} of 10 downloads used.
              </Banner>
            ) : null}
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
              <Button type="button" disabled aria-describedby="phase-note" className="w-full md:w-auto">
                <Download strokeWidth={1.5} />
                Download
              </Button>
              <Button type="button" variant="outline" disabled aria-describedby="phase-note" className="w-full md:w-auto">
                <Bookmark strokeWidth={1.5} />
                Save to Library
              </Button>
              {session.kind === "user" ? <FavoriteButton bookId={book.id} active={saved} /> : null}
            </div>
            <p id="phase-note" className="text-sm leading-5 text-muted-foreground">
              Downloads arrive in Phase 2.
            </p>
          </div>
        </div>
      </div>

      {more.length > 0 ? (
        <section className="mt-16" aria-label={`More in ${book.category}`}>
          <h2 className="serif text-2xl leading-8 font-light">More in {book.category}</h2>
          <ul className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-6">
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
