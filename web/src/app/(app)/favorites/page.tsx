import { Heart } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { FavoritesGrid } from "@/components/favorites-grid";
import { LockedPanel } from "@/components/locked-panel";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { listFavorites } from "@/lib/records";
import { getSession } from "@/lib/session";

export const metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const session = await getSession();
  if (session.kind !== "user") return <LockedPanel title="Favorites" />;

  const books = await listFavorites(session.email);
  const count = books.length === 1 ? "1 book you've saved." : `${books.length} books you've saved.`;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Favorites" lede={count} />
      {books.length === 0 ? (
        <EmptyState
          icon={<Heart size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
          title="No favorites yet."
          action={
            <Button asChild variant="outline">
              <Link href="/browse">Browse books</Link>
            </Button>
          }
        >
          Open a book and choose Save to add it here.
        </EmptyState>
      ) : (
        <FavoritesGrid books={books} />
      )}
    </main>
  );
}
