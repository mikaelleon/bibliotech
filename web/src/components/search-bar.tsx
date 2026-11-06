import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

type SearchBarProps = {
  query?: string;
  /** Landing field is 56px. The shell field is 44px. */
  large?: boolean;
  /** Mobile shell: short placeholder, no key hint. */
  compact?: boolean;
  action?: (formData: FormData) => void | Promise<void>;
  className?: string;
};

export function SearchBar({ query = "", large = false, compact = false, action, className }: SearchBarProps) {
  const placeholder = compact ? "Search books" : "Search by title or author";

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
      <input
        id={large ? "landing-search" : "site-search"}
        name="q"
        defaultValue={query}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-full border border-border bg-card pl-12 text-base text-foreground placeholder:text-muted-foreground",
          large ? "h-14" : "h-11",
          compact ? "pr-4" : "pr-4 md:pr-16",
        )}
      />
      {compact ? null : (
        <kbd
          className={cn(
            "absolute right-4 hidden rounded-sm border border-border px-2 py-0.5 text-xs leading-4 text-muted-foreground md:inline",
            large ? "top-4" : "top-2.5",
          )}
        >
          Ctrl K
        </kbd>
      )}
    </form>
  );
}
