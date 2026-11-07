"use client";

import { CircleAlert } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function BrowseError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <h1 className="page-title">Browse</h1>
      <EmptyState
        role="alert"
        icon={<CircleAlert size={24} strokeWidth={1.5} aria-hidden className="text-brand-text" />}
        title="We couldn’t load this page"
        action={
          <Button type="button" variant="outline" onClick={reset}>
            Try again
          </Button>
        }
      >
        The library server did not answer. Check your connection and try again.
      </EmptyState>
    </main>
  );
}
