import Link from "next/link";

import type { Session } from "@/lib/types";

const LIMIT = 10;

/** Display only. Downloads are not counted yet. */
export function QuotaStrip({ session }: { session: Session }) {
  if (session.kind === "user") {
    const used = Math.max(0, Math.min(LIMIT, session.downloadsUsed));
    const width = `${(used / LIMIT) * 100}%`;
    return (
      <div className="border-b border-border px-4 py-2 md:px-8">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3">
          <p className="text-sm leading-5 text-muted-foreground">
            {used} of {LIMIT} downloads used
          </p>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-border" aria-hidden>
            <i className="block h-full bg-brand" style={{ width }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border px-4 py-2 md:px-8">
      <p className="mx-auto max-w-[1200px] text-sm leading-5 text-muted-foreground">
        Guest: 5 downloads left.{" "}
        <Link href="/register" className="font-medium text-brand-text underline underline-offset-4">
          Sign up
        </Link>{" "}
        for 10.
      </p>
    </div>
  );
}
