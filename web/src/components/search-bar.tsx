"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

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
  /** Unused. Width decides the short placeholder, so the hint never overlaps it. */
  compact?: boolean;
  action?: (formData: FormData) => void | Promise<void>;
  className?: string;
};

type Suggestion = { id: string; title: string; author: string };

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(min-width: 1024px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function wideEnough() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function SearchBar({
  query = "",
  category = "",
  sort = "",
  clearHref,
  large = false,
  action,
  className,
}: SearchBarProps) {
  const wide = useSyncExternalStore(subscribe, wideEnough, () => false);
  const placeholder = large || wide ? "Search by title or author" : "Search";
  const showClear = query.length > 0 && Boolean(clearHref);
  const showHint = wide && !showClear;

  const router = useRouter();
  const listId = useId();
  const [text, setText] = useState(query);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const term = text.trim();
    if (!term) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setItems(data.suggestions ?? []);
        setActive(-1);
      } catch {
        /* aborted or offline: keep the last list */
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text]);

  const visible = open && text.trim().length > 0 ? items : [];

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (visible.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % visible.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? visible.length - 1 : i - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      setOpen(false);
      router.push(`/books/${visible[active].id}`);
    }
  }

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
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={visible.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        className={cn(
          "w-full rounded-xl border border-border bg-card pl-12 text-base text-foreground placeholder:text-muted-foreground",
          large ? "h-14" : "h-11",
          showHint || showClear ? "pr-16" : "pr-4",
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
      ) : showHint ? (
        <ShortcutHint large={large} />
      ) : null}
      {visible.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {visible.map((item, index) => (
            <li
              key={item.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
            >
              <Link
                href={`/books/${item.id}`}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex min-h-11 flex-col justify-center px-4 py-1.5 text-inherit no-underline",
                  index === active && "bg-muted",
                )}
              >
                <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
                <span className="truncate text-xs text-muted-foreground">{item.author}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
