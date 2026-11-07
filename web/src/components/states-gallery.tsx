"use client";

import { useState } from "react";

import { Dialog } from "@/components/dialog";
import { DownloadChart } from "@/components/download-chart";
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
  const [deleteBook, setDeleteBook] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="State gallery" lede="Every state used for the Phase 1 screenshots. This route is off in production." />

      <section className="grid gap-4">
        <h2 className="section-title">Dialogs and toasts</h2>
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
        <h2 className="section-title">Empty, error, and loading</h2>
        <EmptyState
          icon={<SearchX size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />}
          title="No books match that search"
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

      <section className="grid gap-6">
        <h2 className="section-title">Admin</h2>
        <DownloadChart points={[{ date: "2026-10-09", count: 0 }, { date: "2026-11-07", count: 0 }]} />
        <p className="text-sm leading-5 text-muted-foreground">No downloads have been recorded yet.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled>
            Save book
          </Button>
          <p className="text-sm leading-5 text-muted-foreground">Saving arrives in Phase 2.</p>
        </div>
        <div>
          <Button type="button" variant="outline" onClick={() => setDeleteBook(true)}>
            Delete dialog
          </Button>
        </div>
        <Dialog
          open={deleteBook}
          onOpenChange={setDeleteBook}
          title="Delete this book?"
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setDeleteBook(false)}>
                Cancel
              </Button>
              <Button type="button" disabled>
                Delete
              </Button>
            </>
          }
        >
          Pride and Prejudice will be removed. This can&apos;t be undone.
          <span className="mt-2 block text-sm leading-5 text-muted-foreground">Deleting arrives in Phase 2.</span>
        </Dialog>
      </section>
    </main>
  );
}
