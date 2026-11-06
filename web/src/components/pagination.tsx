import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function pageHref(pathname: string, params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** "1 to 25 of 214" with previous and next. Page lives in the URL. */
export function Pagination({
  page,
  pageSize,
  total,
  pathname,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  pathname: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(page, 1), pages);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);
  const previous = pageHref(pathname, params, current - 1);
  const next = pageHref(pathname, params, current + 1);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
      <p className="text-sm leading-5 text-muted-foreground">
        {start} to {end} of {total}
      </p>
      <div className="flex gap-2">
        <PageLink href={previous} disabled={current <= 1} label="Previous page">
          <ChevronLeft size={20} strokeWidth={1.5} aria-hidden />
        </PageLink>
        <PageLink href={next} disabled={current >= pages} label="Next page">
          <ChevronRight size={20} strokeWidth={1.5} aria-hidden />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground opacity-50"
      >
        <span className="sr-only">{label}</span>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground no-underline hover:bg-background",
      )}
    >
      {children}
    </Link>
  );
}
