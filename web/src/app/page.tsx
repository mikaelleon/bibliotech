import Link from "next/link";

import { BookCard } from "@/components/book-card";
import { CardFavorite } from "@/components/card-favorite";
import { SearchBar } from "@/components/search-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { landingSearchAction } from "@/lib/actions";
import { redirectAdminFromLanding } from "@/lib/access";
import { getPopularScienceBooks, getRecentBooks } from "@/lib/books";
import { CATEGORIES } from "@/lib/types";

const benefits = [
  { title: "From Project Gutenberg", text: "Titles come from one public catalog." },
  { title: "Library and favorites", text: "An account keeps downloads in one place and a heart list beside it." },
  { title: "Ten downloads", text: "A free account includes 10 downloads. A guest session includes 5." },
];

export default async function LandingPage() {
  await redirectAdminFromLanding();
  const recent = getRecentBooks();
  const science = getPopularScienceBooks();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 bg-card px-4 py-3 md:px-8">
          <Wordmark />
          <nav aria-label="Account" className="flex items-center gap-2">
            <ThemeToggle compact />
            <Button asChild variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-16">
        <div className="max-w-2xl">
          <h1 className="serif text-[40px] leading-[46px]">Search free, legal books</h1>
          <p className="mt-3 text-muted-foreground">Every title is in the public domain.</p>
          <SearchBar large action={landingSearchAction} className="mt-6 max-w-none" />
          <Button asChild variant="link" className="mt-4 px-0">
            <Link href="/guest">Continue as guest</Link>
          </Button>
        </div>

        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {benefits.map((item) => (
            <li key={item.title} className="rounded-xl bg-card p-8">
              <h2 className="text-base leading-6 font-medium">{item.title}</h2>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">{item.text}</p>
            </li>
          ))}
        </ul>

        <section className="mt-16" aria-label="Browse as a guest">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="section-title">Browse as a guest</h2>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                Choosing a category starts a guest session.
              </p>
            </div>
            <Link href="/guest?next=%2Fbrowse" className="text-sm leading-5 text-brand-text underline">
              Browse all
            </Link>
          </div>
          <ul className="mt-6 flex gap-2 overflow-x-auto">
            {CATEGORIES.map((category) => (
              <li key={category} className="shrink-0">
                <Link
                  href={`/guest?next=${encodeURIComponent(`/browse?category=${category}`)}`}
                  className="inline-flex min-h-11 items-center rounded-xl bg-card px-4 text-sm leading-5 no-underline"
                >
                  {category}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16" aria-label="Recently added">
          <h2 className="section-title">Recently added</h2>
          <ul className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {recent.map((book) => (
              <li key={book.id}>
                <BookCard
                  book={book}
                  href={`/books/${book.id}`}
                  corner={<CardFavorite bookId={book.id} active={false} signedIn={false} />}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16" aria-label="Popular in Science">
          <h2 className="section-title">Popular in Science</h2>
          <ul className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {science.map((book) => (
              <li key={book.id}>
                <BookCard
                  book={book}
                  href={`/books/${book.id}`}
                  corner={<CardFavorite bookId={book.id} active={false} signedIn={false} />}
                />
              </li>
            ))}
          </ul>
        </section>
      </main>
      <footer>
        <div className="mx-auto grid max-w-[1200px] gap-2 px-4 py-8 text-sm leading-5 text-muted-foreground md:px-8">
          <p>E-Library AI is a catalog of public-domain books.</p>
          <p>The texts are from Project Gutenberg. This app does not claim copyright in those works.</p>
        </div>
      </footer>
    </div>
  );
}
