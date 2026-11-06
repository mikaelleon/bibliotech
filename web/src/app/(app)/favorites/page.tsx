import { Heart } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { LockedPanel } from "@/components/locked-panel";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export const metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const session = await getSession();
  if (session.kind !== "user") return <LockedPanel title="Favorites" />;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
      <h1 className="serif text-[32px] leading-10">Favorites</h1>
      <EmptyState
        className="mt-6"
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
    </main>
  );
}
