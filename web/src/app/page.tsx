import Link from "next/link";

import { BookCard } from "@/components/book-card";
import { SearchBar } from "@/components/search-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { landingSearchAction } from "@/lib/actions";
import { redirectAdminFromLanding } from "@/lib/access";
import { getPopularScienceBooks, getRecentBooks } from "@/lib/books";
import { CATEGORIES } from "@/lib/types";

export default async function LandingPage() {
  await redirectAdminFromLanding();
  const recent = getRecentBooks();
  const science = getPopularScienceBooks();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-4 py-3 md:px-8">
          <Wordmark />
          <nav aria-label="Account" className="flex shrink-0 items-center gap-1 md:gap-2">
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
      <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
        <div className="max-w-2xl">
          <h1 className="text-[32px] leading-10 font-semibold md:text-[40px] md:leading-[46px]">
            Free public&#8209;domain books
          </h1>
          <p className="mt-2 text-muted-foreground">
            From Project Gutenberg. Guests get 5 downloads, free accounts get 10.
          </p>
          <SearchBar large action={landingSearchAction} className="mt-6 max-w-none" />
        </div>

        <nav aria-label="Categories" className="mt-6">
          <ul className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((category) => (
              <li key={category}>
                <Link
                  href={`/guest?next=${encodeURIComponent(`/browse?category=${category}`)}`}
                  className="inline-flex min-h-11 items-center rounded-full bg-card px-4 text-sm leading-5 no-underline"
                >
                  {category}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/guest" className="inline-flex min-h-11 items-center text-sm leading-5 text-brand-text underline">
                Browse all as a guest
              </Link>
            </li>
          </ul>
        </nav>

        <section className="mt-12" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="section-title">
            Recently added
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {recent.map((book) => (
              <li key={book.id}>
                <BookCard book={book} />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12" aria-labelledby="science-heading">
          <h2 id="science-heading" className="section-title">
            Popular in Science
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {science.map((book) => (
              <li key={book.id}>
                <BookCard book={book} />
              </li>
            ))}
          </ul>
        </section>
      </main>
      <footer className="mx-auto max-w-[1200px] px-4 py-8 text-sm leading-5 text-muted-foreground md:px-8">
        Texts from{" "}
        <a href="https://www.gutenberg.org" className="underline" target="_blank" rel="noreferrer">
          Project Gutenberg
        </a>
      </footer>
    </div>
  );
}
