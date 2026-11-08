import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { BackLink } from "@/components/back-link";
import { BookGrid } from "@/components/book-grid";
import { BookSummary } from "@/components/book-summary";
import { BookCover } from "@/components/book-cover";
import { BookActions } from "@/components/book-actions";
import { DownloadBook } from "@/components/download-book";
import { DefinitionList } from "@/components/definition-list";
import { listCatalog } from "@/lib/catalog";
import { relatedBooks } from "@/lib/books";
import { getSession } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = (await listCatalog()).find((item) => item.id === id);
  return { title: book?.title ?? "Book" };
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const catalog = await listCatalog();
  const book = catalog.find((item) => item.id === id);
  if (!book) notFound();
  const session = await getSession();
  const reader = session.kind === "user" && session.role !== "admin";

  const more = relatedBooks(book, catalog);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pt-2 pb-6 md:px-8 md:py-8">
      <BackLink />

      <div className="mt-2 flex flex-col items-start gap-6 md:mt-4 md:flex-row md:gap-12">
        <div className="w-48 shrink-0 md:w-[280px]">
          <BookCover book={book} transitionName={`book-${book.id}`} />
        </div>
        <div
          className="stagger min-w-0 flex-1"
          style={{ "--stagger-start": "80ms" } as CSSProperties}
        >
          <h1 className="serif text-[32px] leading-10 font-normal md:text-[40px] md:leading-[46px]">{book.title}</h1>
          <p className="mt-1 text-muted-foreground md:text-xl md:leading-7">{book.author}</p>
          <DefinitionList
            className="mt-4 md:mt-6"
            items={[
              { term: "Category", value: book.category },
              { term: "Language", value: book.language },
              { term: "License", value: book.license },
              {
                term: "Read online",
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
          <BookSummary summary={book.summary} long={Boolean(book.summaryShort)} />
          <div className="mt-6 md:mt-8">
            <BookActions bookId={book.id} />
            <DownloadBook
              bookId={book.id}
              title={book.title}
              author={book.author}
              category={book.category}
              hasFile={Boolean(book.hasFile)}
              fileSize={book.fileSize}
              attribution={book.attribution}
              sourceName={book.sourceName}
              canDownload={reader}
              admin={session.kind === "user" && session.role === "admin"}
              used={reader ? session.downloadsUsed : 0}
              limit={reader ? session.downloadLimit : 0}
              verified={reader ? session.verified : false}
              resetsAt={reader ? session.resetsAt : null}
            />
          </div>
        </div>
      </div>

      {more.length > 0 ? (
        <section className="mt-16" aria-label={`More in ${book.category}`}>
          <h2 className="section-title">More in {book.category}</h2>
          <BookGrid books={more} showCategory={false} className="mt-6 md:grid-cols-6" />
        </section>
      ) : null}
    </main>
  );
}
