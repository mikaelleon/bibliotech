import { Library } from "lucide-react";
import Link from "next/link";

import { LibraryViews } from "@/components/library-views";
import { ShelfCount } from "@/components/shelf-grid";
import { EmptyState } from "@/components/empty-state";
import { LockedPanel } from "@/components/locked-panel";
import { Button } from "@/components/ui/button";
import { listCatalog } from "@/lib/catalog";
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
  const catalogPromise = listCatalog();
  const session = await getSession();
  if (session.kind !== "user") return <LockedPanel title="Library" />;

  const params = await searchParams;
  const sort: Sort = params.sort === "title" || params.sort === "author" ? params.sort : "added";
  const [books, catalog] = await Promise.all([listLibrary(session.id), catalogPromise]);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <LibraryViews
        lede={<ShelfCount shelf="library" />}
        books={books}
        sort={sort}
        options={sortOptions}
        shelf="library"
        catalog={catalog}
        empty={
          <EmptyState
            icon={<Library size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
            title="Your Library is empty"
            action={
              <Button asChild variant="outline">
                <Link href="/browse">Browse books</Link>
              </Button>
            }
          >
            Open a book and choose Add to Library. It doesn’t use a download.
          </EmptyState>
        }
      />
    </main>
  );
}
