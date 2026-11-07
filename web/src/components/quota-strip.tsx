import type { Session } from "@/lib/types";

const LIMIT = 10;

/** Compact quota for the top bar. Downloads are not counted yet. */
export function QuotaMeter({ session }: { session: Session }) {
  if (session.kind === "guest") {
    return <p className="shrink-0 text-sm leading-5 text-muted-foreground">5 left</p>;
  }

  if (session.kind !== "user") return null;

  const used = Math.max(0, Math.min(LIMIT, session.downloadsUsed));
  const width = `${(used / LIMIT) * 100}%`;

  return (
    <div className="hidden shrink-0 items-center gap-2 md:flex">
      <p className="text-sm leading-5 text-muted-foreground">
        {used} of {LIMIT}
      </p>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-border" aria-hidden>
        <i className="bar-grow block h-full bg-brand" style={{ width }} />
      </div>
    </div>
  );
}
