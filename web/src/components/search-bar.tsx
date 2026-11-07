import { Search, X } from "lucide-react";
import Link from "next/link";

import { ShortcutHint } from "@/components/shortcut-hint";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  query?: string;
  /** Kept when the reader submits a new query, until they clear it. */
  category?: string;
  sort?: string;
  /** Where the clear control goes. Omitted when the field is empty. */
  clearHref?: string;
  /** Landing field is 56px. The shell field is 44px. */
  large?: boolean;
  /** Mobile shell: short placeholder, no key hint. */
  compact?: boolean;
  action?: (formData: FormData) => void | Promise<void>;
  className?: string;
};

export function SearchBar({
  query = "",
  category = "",
  sort = "",
  clearHref,
  large = false,
  compact = false,
  action,
  className,
}: SearchBarProps) {
  const placeholder = compact ? "Search books" : "Search by title or author";
  const showClear = query.length > 0 && Boolean(clearHref);

  return (
    <form
      action={action ?? "/search"}
      role="search"
      className={cn("relative min-w-0 flex-1", !large && "max-w-xl", className)}
    >
      <label htmlFor={large ? "landing-search" : "site-search"} className="sr-only">
        {placeholder}
      </label>
      <Search
        size={20}
        strokeWidth={1.5}
        aria-hidden
        className={cn("pointer-events-none absolute left-4 text-muted-foreground", large ? "top-[18px]" : "top-3")}
      />
      {category ? <input type="hidden" name="category" value={category} /> : null}
      {sort && sort !== "catalog" ? <input type="hidden" name="sort" value={sort} /> : null}
      <input
        id={large ? "landing-search" : "site-search"}
        name="q"
        defaultValue={query}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        className={cn(
          "w-full rounded-xl border border-border bg-card pl-12 text-base text-foreground placeholder:text-muted-foreground",
          large ? "h-14" : "h-11",
          showClear || !compact ? "pr-12" : "pr-4",
        )}
      />
      {showClear ? (
        <Link
          href={clearHref ?? "/browse"}
          aria-label="Clear search"
          className={cn(
            "absolute right-1.5 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground",
            large ? "top-3" : "top-1.5",
          )}
        >
          <X size={16} strokeWidth={1.5} aria-hidden />
        </Link>
      ) : compact ? null : (
        <ShortcutHint large={large} />
      )}
    </form>
  );
}
