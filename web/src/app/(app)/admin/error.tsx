"use client";

import { ErrorPanel } from "@/components/error-panel";
import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorPanel
      title="We couldn't load this page"
      action={
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      }
    >
      The admin figures did not load. Check your connection and try again.
    </ErrorPanel>
  );
}
