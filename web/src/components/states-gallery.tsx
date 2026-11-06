"use client";

import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorPanel } from "@/components/error-panel";
import { LimitDialog } from "@/components/limit-dialog";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchX } from "lucide-react";

/** Internal gallery. The route calls notFound() when NODE_ENV is production. */
export function StatesGallery() {
  const { toast } = useToast();
  const [guestLimit, setGuestLimit] = useState(false);
  const [userLimit, setUserLimit] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="State gallery" lede="Every state used for the Phase 1 screenshots. This route is off in production." />

      <section className="grid gap-4">
        <h2 className="serif text-2xl leading-8 font-light">Dialogs and toasts</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setGuestLimit(true)}>
            Guest download limit
          </Button>
          <Button type="button" variant="outline" onClick={() => setUserLimit(true)}>
            Registered download limit
          </Button>
          <Button type="button" variant="outline" onClick={() => toast("Display name saved.")}>
            Show a toast
          </Button>
        </div>
        <LimitDialog open={guestLimit} onOpenChange={setGuestLimit} guest />
        <LimitDialog open={userLimit} onOpenChange={setUserLimit} guest={false} />
      </section>

      <section className="grid gap-8">
        <h2 className="serif text-2xl leading-8 font-light">Empty, error, and loading</h2>
        <EmptyState
          icon={<SearchX size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
          title="No books match that search."
          action={<Button type="button" variant="outline">Clear search</Button>}
        >
          Try a different title, author, or category.
        </EmptyState>
        <ErrorPanel title={"You don't have access to this area"} action={<Button type="button">Back to Browse</Button>}>
          Admin pages are limited to accounts with the admin role.
        </ErrorPanel>
        <ErrorPanel title={"We couldn't find that page"} action={<Button type="button">Back to Browse</Button>}>
          The address may be mistyped, or the page may have moved.
        </ErrorPanel>
        <div aria-busy="true" className="grid max-w-md gap-3">
          <span className="sr-only">Loading</span>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="aspect-[2/3] w-40" />
        </div>
      </section>
    </main>
  );
}
