import Link from "next/link";

/** Empty message for a table row: what is missing, and an optional way out. */
export function EmptyRow({ title, clearHref, clearLabel = "Clear search" }: { title: string; clearHref?: string; clearLabel?: string }) {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span>{title}</span>
      {clearHref ? (
        <Link href={clearHref} className="text-brand-text underline">
          {clearLabel}
        </Link>
      ) : null}
    </span>
  );
}
