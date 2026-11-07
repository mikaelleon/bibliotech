import { Heart } from "lucide-react";
import Link from "next/link";

import { SortedShelf } from "@/components/sorted-shelf";
import { EmptyState } from "@/components/empty-state";
import { ShelfCount } from "@/components/shelf-grid";
import { LockedPanel } from "@/components/locked-panel";
import { SuggestedBooks } from "@/components/suggested-books";
import { Button } from "@/components/ui/button";
import { listFavorites } from "@/lib/records";
import { getSession } from "@/lib/session";

const sortOptions = [
  { value: "saved", label: "Recently saved" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
];

export const metadata = { title: "Favorites" };

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const session = await getSession();
  if (session.kind !== "user") return <LockedPanel title="Favorites" />;

  const params = await searchParams;
  const sort = params.sort === "title" || params.sort === "author" ? params.sort : "saved";
  const saved = await listFavorites(session.id);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <SortedShelf
        title="Favorites"
        lede={<ShelfCount shelf="favorites" />}
        books={saved}
        sort={sort}
        options={sortOptions}
        shelf="favorites"
        empty={
          <>
            <EmptyState
              icon={<Heart size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
              title="No favorites yet"
              action={
                <Button asChild variant="outline">
                  <Link href="/browse">Browse books</Link>
                </Button>
              }
            >
              Tap the heart on any book to keep it here.
            </EmptyState>
            <SuggestedBooks />
          </>
        }
      />
    </main>
  );
}
