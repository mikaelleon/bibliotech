import Link from "next/link";

/** Empty message for a table row: what is missing, and an optional way out. */
export function EmptyRow({
  title,
  clearHref,
  clearLabel = "Clear search",
  onClear,
}: {
  title: string;
  clearHref?: string;
  clearLabel?: string;
  /** Clears the filter in place. Takes the place of following `clearHref`. */
  onClear?: () => void;
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span>{title}</span>
      {onClear ? (
        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-inherit text-brand-text underline" onClick={onClear}>
          {clearLabel}
        </button>
      ) : clearHref ? (
        <Link href={clearHref} className="text-brand-text underline">
          {clearLabel}
        </Link>
      ) : null}
    </span>
  );
}
