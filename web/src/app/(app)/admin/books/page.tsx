import Link from "next/link";

import { AdminBooksTable } from "@/components/admin-books-table";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SectionTabs } from "@/components/section-tabs";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { isAdminSession } from "@/lib/admin";
import { filterBooks, getBooks } from "@/lib/books";
import { getSession } from "@/lib/session";
import { CATEGORIES, type Category } from "@/lib/types";

const pageSize = 25;

export const metadata = { title: "Books" };

export default async function AdminBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const category = CATEGORIES.includes(params.category as Category) ? params.category : undefined;
  const requested = Number(params.page ?? "1");
  const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;
  const matches = filterBooks(getBooks(), query, category);
  const visible = matches.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <div>
        <PageHeader
          title="Books"
          lede="The catalog. Adding and editing stay off until Phase 2."
          action={
            <Button asChild>
              <Link href="/admin/books/new">Add book</Link>
            </Button>
          }
        />
        <SectionTabs />
      </div>
      <form action="/admin/books" className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="grid min-w-0 flex-1 gap-2 text-sm leading-5">
          <span className="sr-only">Search by title or author</span>
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by title or author"
            className="h-11 rounded-full border border-border bg-card px-4 text-base"
          />
        </label>
        <label className="grid gap-2 text-sm leading-5">
          <span className="sr-only">Category</span>
          <Select name="category" defaultValue={category ?? ""}>
            <option value="">All categories</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>
      <div>
        <AdminBooksTable books={visible} />
        <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={matches.length}
            pathname="/admin/books"
            params={{ q: query || undefined, category }}
          />
        </div>
      </div>
    </main>
  );
}
