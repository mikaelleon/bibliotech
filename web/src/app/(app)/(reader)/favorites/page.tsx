import { Heart } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CatalogSort } from "@/components/catalog-sort";
import { EmptyState } from "@/components/empty-state";
import { FavoritesGrid } from "@/components/favorites-grid";
import { LockedPanel } from "@/components/locked-panel";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { sortBooks, type BookSort } from "@/lib/books";
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
  const sort: BookSort | "saved" = params.sort === "title" || params.sort === "author" ? params.sort : "saved";
  const saved = await listFavorites(session.email);
  const books = sort === "saved" ? saved : sortBooks(saved, sort);
  const count = books.length === 1 ? "1 favorite." : `${books.length} favorites.`;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Favorites"
        lede={count}
        action={
          <Suspense>
            <CatalogSort value={sort} options={sortOptions} />
          </Suspense>
        }
      />
      {books.length === 0 ? (
        <EmptyState
          icon={<Heart size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
          title="No favorites yet"
          action={
            <Button asChild variant="outline">
              <Link href="/books/pride-and-prejudice">Start with Pride and Prejudice</Link>
            </Button>
          }
        >
          Open a book and choose Favorite to add it here.
        </EmptyState>
      ) : (
        <FavoritesGrid books={books} />
      )}
    </main>
  );
}
