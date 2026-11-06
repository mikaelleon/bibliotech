import { Library } from "lucide-react";
import Link from "next/link";

import { BookCard } from "@/components/book-card";
import { EmptyState } from "@/components/empty-state";
import { LibrarySort } from "@/components/library-sort";
import { LockedPanel } from "@/components/locked-panel";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { listLibrary, type LibrarySort as Sort } from "@/lib/records";
import { getSession } from "@/lib/session";

export const metadata = { title: "My Library" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const session = await getSession();
  if (session.kind !== "user") return <LockedPanel title="My Library" />;

  const params = await searchParams;
  const sort: Sort = params.sort === "title" || params.sort === "author" ? params.sort : "added";
  const books = await listLibrary(session.email, sort);
  const count = books.length === 1 ? "1 book you've saved." : `${books.length} books you've saved.`;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="My Library" lede={count} />
      <LibrarySort value={sort} />
      {books.length === 0 ? (
        <EmptyState
          icon={<Library size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
          title="Your library is empty."
          action={
            <Button asChild variant="outline">
              <Link href="/browse">Browse books</Link>
            </Button>
          }
        >
          Books you download will appear here, so you can find them again.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
          {books.map((book) => (
            <li key={book.id}>
              <BookCard book={book} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
