import { BookCard } from "@/components/book-card";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { landingSearchAction } from "@/lib/actions";
import { getPopularScienceBooks, getRecentBooks } from "@/lib/books";
import Link from "next/link";

export default function LandingPage() {
  const recent = getRecentBooks();
  const science = getPopularScienceBooks();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-8">
          <Wordmark />
          <nav aria-label="Account" className="flex gap-2">
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
          <h1 className="serif text-[40px] leading-[46px]">Search free, legally downloadable books.</h1>
          <p className="mt-3 text-muted-foreground">Every title is in the public domain. Search by title or author to start.</p>
          <SearchBar large action={landingSearchAction} className="mt-6 max-w-none" />
          <Button asChild variant="link" className="mt-2">
            <Link href="/guest">Continue as guest</Link>
          </Button>
        </div>

        <section className="mt-16" aria-label="Recently added">
          <h2 className="serif text-[32px] leading-10">Recently added</h2>
          <ul className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {recent.map((book) => (
              <li key={book.id}>
                <BookCard book={book} href={`/guest?next=${encodeURIComponent(`/books/${book.id}`)}`} />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16" aria-label="Popular in Science">
          <h2 className="serif text-[32px] leading-10">Popular in Science</h2>
          <ul className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {science.map((book) => (
              <li key={book.id}>
                <BookCard book={book} href={`/guest?next=${encodeURIComponent(`/books/${book.id}`)}`} />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
