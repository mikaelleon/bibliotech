import { Library } from "lucide-react";
import Link from "next/link";

import { LibraryViews, type LibraryView } from "@/components/library-views";
import { EmptyState } from "@/components/empty-state";
import { LockedPanel } from "@/components/locked-panel";
import { Button } from "@/components/ui/button";
import { listCatalog } from "@/lib/catalog";
import { listCollections } from "@/lib/collections";
import { listProgress } from "@/lib/progress";
import { libraryAddedAt, listLibrary } from "@/lib/records";
import { getSession } from "@/lib/session";

export const metadata = { title: "Library" };

const views: LibraryView[] = ["all", "reading", "finished", "collections", "on-device"];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; sort?: string; c?: string }>;
}) {
  const catalogPromise = listCatalog();
  const session = await getSession();
  if (session.kind !== "user") return <LockedPanel title="Library" />;

  const params = await searchParams;
  const view: LibraryView = views.includes(params.view as LibraryView) ? (params.view as LibraryView) : "all";
  const [books, catalog, groups, progress, addedAt] = await Promise.all([
    listLibrary(session.id),
    catalogPromise,
    listCollections(session.id),
    listProgress(session.id),
    libraryAddedAt(session.id),
  ]);
  const hasProgress = progress.some((row) => row.progress > 0);
  const defaultSort = hasProgress ? "read" : "added";
  const requested = params.sort;
  const sort = requested === "read" || requested === "added" || requested === "title" || requested === "author" ? requested : defaultSort;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <LibraryViews
        books={books}
        groups={groups}
        progress={progress}
        addedAt={addedAt}
        catalog={catalog}
        view={view}
        sort={sort}
        defaultSort={defaultSort}
        collectionId={params.c}
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
            Open a book and choose Add to Library. It doesn&apos;t use a download.
          </EmptyState>
        }
      />
    </main>
  );
}
