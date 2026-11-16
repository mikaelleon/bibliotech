import type { Metadata } from "next";
import Link from "next/link";

import { FirstLines, type ShelfItem } from "@/components/first-lines";
import { GuestLink } from "@/components/guest-link";
import { SearchBar } from "@/components/search-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { landingSearchAction } from "@/lib/actions";
import { redirectAdminFromLanding } from "@/lib/access";
import { getBook } from "@/lib/books";
import { listCatalog } from "@/lib/catalog";
import { coverColors } from "@/lib/cover";
import { FIRST_LINES, SHELF_LINES, START_SLUG, lineSize, spineJitter } from "@/lib/first-lines";
import { displayTitle } from "@/lib/title";
import { CATEGORIES } from "@/lib/types";

export const metadata: Metadata = {
  title: { absolute: "Bibliotech: free public-domain books" },
  description: "Free public-domain books from Project Gutenberg. Read them in your browser, or download one to keep.",
};

/** The books on the hero shelf, from the live catalog. A book that is not in the catalog is skipped. */
function shelfItems(): ShelfItem[] {
  return FIRST_LINES.flatMap((entry) => {
    const book = getBook(entry.slug);
    if (!book) return [];
    const { background, color } = coverColors(book.id);
    return [
      {
        slug: book.id,
        title: entry.name ?? displayTitle(book.title),
        author: book.author,
        line: entry.line,
        hang: Boolean(entry.hang),
        size: lineSize(entry.line),
        background,
        color,
        width: 0.8 + spineJitter(book.id, 7) * 0.42,
        height: 84 + spineJitter(book.id, 13) * 16,
      },
    ];
  });
}

export default async function LandingPage() {
  await redirectAdminFromLanding();
  const catalog = await listCatalog();
  const items = shelfItems();
  const start = Math.max(
    0,
    items.findIndex((item) => item.slug === START_SLUG),
  );
  const guestHref = (category?: string) =>
    category ? `/guest?next=${encodeURIComponent(`/browse?category=${category}`)}` : "/guest";
  const counted = CATEGORIES.map((label) => ({
    label,
    count: catalog.filter((book) => book.category === label).length,
  }))
    .filter((shelf) => shelf.count > 0)
    .sort((a, b) => b.count - a.count);
  // The biggest shelves that have an opening line are set with it. The rest are listed after them.
  const lined = counted.flatMap((shelf) => {
    const entry = SHELF_LINES.find((item) => item.category === shelf.label);
    const book = entry ? getBook(entry.slug) : undefined;
    if (!entry || !book) return [];
    const title = FIRST_LINES.find((item) => item.slug === entry.slug)?.name ?? displayTitle(book.title);
    return [{ ...shelf, line: entry.line, title, author: book.author }];
  });
  const others = counted.filter((shelf) => !lined.some((item) => item.label === shelf.label));

  return (
    <div data-landing className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-2 px-4 py-3 md:px-8">
          <Wordmark />
          <nav aria-label="Account" className="flex shrink-0 items-center gap-1 md:gap-2">
            <a href="#about" className="hidden min-h-11 items-center px-2 text-sm leading-5 no-underline min-[440px]:inline-flex">
              About
            </a>
            <ThemeToggle compact />
            <Button asChild variant="outline" className="px-4 md:px-6">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild className="px-4 md:px-6">
              <Link href="/register">Register</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-4 pb-16 md:px-8">
        {items.length > 0 ? (
          <FirstLines
            items={items}
            start={start}
            search={
              <SearchBar
                large
                hint={false}
                action={landingSearchAction}
                placeholder={`Search ${catalog.length} books by title or author`}
                className="max-w-none"
              />
            }
          />
        ) : (
          <section className="py-12">
            <h1 className="text-[32px] leading-10 font-semibold md:text-[40px] md:leading-[46px]">
              Free public&#8209;domain books
            </h1>
            <p className="mt-2 text-muted-foreground">Read them here, or download one to keep.</p>
            <SearchBar large action={landingSearchAction} className="mt-6 max-w-none" />
          </section>
        )}

        <section aria-labelledby="shelves-heading" className="mt-16 grid gap-8 md:grid-cols-[1fr_3fr] md:gap-12">
          <div>
            <h2 id="shelves-heading" className="section-title">
              Shelves
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Sixteen are on the shelf above.
            </p>
          </div>
          <div>
            <ul className="border-b border-border">
              {lined.map((shelf) => (
                <li key={shelf.label}>
                  <GuestLink
                    href={guestHref(shelf.label)}
                    className="hover-fill grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-border py-6 no-underline hover:bg-card md:grid-cols-[9rem_1fr_auto] md:gap-x-8"
                  >
                    <span className="text-base leading-6 font-medium">{shelf.label}</span>
                    <span className="col-span-2 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1">
                      <span lang="en" className="serif block text-[28px] leading-9 text-balance md:text-[32px] md:leading-10">
                        {shelf.line}
                      </span>
                      <span className="mt-2 block text-sm leading-5 text-muted-foreground">
                        {shelf.title}, {shelf.author}
                      </span>
                    </span>
                    <span className="col-start-2 row-start-1 text-sm leading-5 tabular-nums text-muted-foreground md:col-start-3">
                      {shelf.count}
                    </span>
                  </GuestLink>
                </li>
              ))}
              <li>
                <GuestLink
                  href={guestHref()}
                  className="hover-fill flex min-h-12 items-baseline justify-between gap-4 border-t border-border py-3 no-underline hover:bg-card"
                >
                  <span>All books</span>
                  <span className="text-sm leading-5 tabular-nums text-muted-foreground">{catalog.length}</span>
                </GuestLink>
              </li>
            </ul>
            {others.length > 0 ? (
              <p className="mt-4 text-sm leading-5 text-muted-foreground">
                Also{" "}
                {others.map((shelf, position) => (
                  <span key={shelf.label}>
                    {position > 0 ? ", " : ""}
                    <GuestLink href={guestHref(shelf.label)} className="text-foreground underline">
                      {shelf.label}
                    </GuestLink>{" "}
                    <span className="tabular-nums">{shelf.count}</span>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </section>

        <section
          id="about"
          aria-labelledby="about-heading"
          className="mt-16 grid scroll-mt-24 gap-8 md:grid-cols-[1fr_3fr] md:gap-12"
        >
          <h2 id="about-heading" className="section-title">
            About
          </h2>
          <dl className="border-b border-border text-sm leading-5">
            <div className="grid gap-1 border-t border-border py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-muted-foreground">Books</dt>
              <dd>
                Public domain, from{" "}
                <a href="https://www.gutenberg.org" className="underline" target="_blank" rel="noreferrer">
                  Project Gutenberg
                </a>
              </dd>
            </div>
            <div className="grid gap-1 border-t border-border py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-muted-foreground">Guest</dt>
              <dd>5 downloads a month</dd>
            </div>
            <div className="grid gap-1 border-t border-border py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-muted-foreground">Free account</dt>
              <dd>5 downloads a month, 10 once your email is verified</dd>
            </div>
            <div className="grid gap-1 border-t border-border py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-muted-foreground">With an account</dt>
              <dd>A library, favorites, and an assistant you can ask about the book you have open</dd>
            </div>
          </dl>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1360px] flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-4 pb-8 text-sm leading-5 text-muted-foreground md:px-8">
        <p>
          Texts from{" "}
          <a href="https://www.gutenberg.org" className="underline" target="_blank" rel="noreferrer">
            Project Gutenberg
          </a>
        </p>
        <nav aria-label="Legal" className="flex gap-6">
          <Link href="/privacy" className="inline-flex min-h-11 items-center underline">
            Privacy
          </Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center underline">
            Terms
          </Link>
        </nav>
      </footer>
    </div>
  );
}
