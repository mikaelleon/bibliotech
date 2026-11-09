import { redirect } from "next/navigation";

import { BookGrid } from "@/components/book-grid";
import { CatalogResults } from "@/components/catalog-results";
import { FeaturedShelf } from "@/components/featured-shelf";
import { VerifyEmailBanner } from "@/components/verify-email-banner";
import { getBooks, type BookSort } from "@/lib/books";
import { listCatalog } from "@/lib/catalog";
import { listLibrary } from "@/lib/records";
import { getSession } from "@/lib/session";
import { CATEGORIES, type Category } from "@/lib/types";

const pageSize = 24;
const sortOptions = [
  { value: "catalog", label: "Catalog order" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
];

export const metadata = { title: "Browse" };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const category = CATEGORIES.includes(params.category as Category) ? params.category : undefined;
  const sort: BookSort = params.sort === "title" || params.sort === "author" ? params.sort : "catalog";
  const requested = Number(params.page ?? "1");
  const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;
  const searching = query.length > 0;
  if (searching) {
    const next = new URLSearchParams();
    next.set("q", query);
    if (category) next.set("category", category);
    if (sort !== "catalog") next.set("sort", sort);
    redirect(`/search?${next.toString()}`);
  }

  const catalogPromise = listCatalog();
  const session = await getSession();
  const catalog = await catalogPromise;
  const library = session.kind === "user" ? await listLibrary(session.id) : [];

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      {session.kind === "user" && session.role !== "admin" && !session.verified ? (
        <VerifyEmailBanner email={session.email} />
      ) : null}
      <FeaturedShelf books={catalog.length ? catalog : getBooks()} />
      {library.length > 0 ? (
        <section aria-label="In your library">
          <h2 className="section-title">In your library</h2>
          <div className="mt-6">
            <BookGrid books={library} />
          </div>
        </section>
      ) : null}
      <CatalogResults
        books={catalog}
        category={category}
        sort={sort}
        page={page}
        pageSize={pageSize}
        base="/browse"
        options={sortOptions}
      />
    </main>
  );
}
