import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export default function BookNotFound() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
      <EmptyState
        icon={<BookOpen size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
        title="This book is not in the library"
        action={
          <Button asChild variant="outline">
            <Link href="/browse">Back to Browse</Link>
          </Button>
        }
      >
        The link may be old. Browse the catalog to pick another title.
      </EmptyState>
    </main>
  );
}
