import Link from "next/link";

import { AdminBooksFilters } from "@/components/admin-books-filters";
import { AdminBooksTable } from "@/components/admin-books-table";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SectionTabs } from "@/components/section-tabs";
import { Button } from "@/components/ui/button";
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
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 py-6 md:px-8 md:py-8">
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
      <AdminBooksFilters query={query} category={category} />
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
