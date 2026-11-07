"use client";

import Link from "next/link";

import { ErrorPanel } from "@/components/error-panel";
import { Button } from "@/components/ui/button";

export default function SearchError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorPanel
      title="Search didn't load"
      action={
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      }
    >
      The catalog could not be read. <Link href="/browse">Back to Browse</Link>
    </ErrorPanel>
  );
}
