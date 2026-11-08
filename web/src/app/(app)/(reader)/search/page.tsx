import { CatalogResults } from "@/components/catalog-results";
import { PageHeader } from "@/components/page-header";
import { listCatalog } from "@/lib/catalog";
import { type BookSort } from "@/lib/books";
import { CATEGORIES, type Category } from "@/lib/types";

const pageSize = 24;
const sortOptions = [
  { value: "catalog", label: "Best match" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
];

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const category = CATEGORIES.includes(params.category as Category) ? params.category : undefined;
  const sort: BookSort = params.sort === "title" || params.sort === "author" ? params.sort : "catalog";
  const requested = Number(params.page ?? "1");
  const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;
  const catalog = await listCatalog();

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title={query ? `Results for “${query}”` : "Search"} />
      <CatalogResults
        books={catalog}
        query={query}
        category={category}
        sort={sort}
        page={page}
        pageSize={pageSize}
        base="/search"
        options={sortOptions}
        suggest
      />
    </main>
  );
}
