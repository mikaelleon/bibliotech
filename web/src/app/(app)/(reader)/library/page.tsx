import { Library } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { BookGrid } from "@/components/book-grid";
import { CatalogSort } from "@/components/catalog-sort";
import { EmptyState } from "@/components/empty-state";
import { LockedPanel } from "@/components/locked-panel";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { listLibrary, type LibrarySort as Sort } from "@/lib/records";
import { getSession } from "@/lib/session";

const sortOptions = [
  { value: "added", label: "Recently added" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
];

export const metadata = { title: "Library" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const session = await getSession();
  if (session.kind !== "user") return <LockedPanel title="Library" />;

  const params = await searchParams;
  const sort: Sort = params.sort === "title" || params.sort === "author" ? params.sort : "added";
  const books = await listLibrary(session.email, sort);
  const count = books.length === 1 ? "1 book in your library." : `${books.length} books in your library.`;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Library"
        lede={count}
        action={
          <Suspense>
            <CatalogSort value={sort} options={sortOptions} />
          </Suspense>
        }
      />
      {books.length === 0 ? (
        <EmptyState
          icon={<Library size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
          title="Your library is empty"
          action={
            <Button asChild variant="outline">
              <Link href="/books/pride-and-prejudice">Start with Pride and Prejudice</Link>
            </Button>
          }
        >
          Books you download will appear here, so you can find them again.
        </EmptyState>
      ) : (
        <BookGrid books={books} />
      )}
    </main>
  );
}
