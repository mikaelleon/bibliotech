import Link from "next/link";

import { AdminBooksFilters } from "@/components/admin-books-filters";
import { AdminBooksTable } from "@/components/admin-books-table";
import { EmptyRow } from "@/components/empty-row";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
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
  searchParams: Promise<{ q?: string; category?: string; page?: string; missing?: string }>;
}) {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const category = CATEGORIES.includes(params.category as Category) ? params.category : undefined;
  const missing = params.missing === "cover" || params.missing === "license" ? params.missing : undefined;
  const requested = Number(params.page ?? "1");
  const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;
  const matches = filterBooks(getBooks(), query, category).filter((book) => {
    if (missing === "cover") return !book.coverUrl;
    if (missing === "license") return book.license.trim() === "";
    return true;
  });
  const visible = matches.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Books"
        lede={
          missing === "cover"
            ? "Books missing a cover."
            : missing === "license"
              ? "Books missing a license."
              : undefined
        }
        action={
          <Button asChild>
            <Link href="/admin/books/new">Add book</Link>
          </Button>
        }
      />
      <AdminBooksFilters query={query} category={category} missing={missing} />
      <div>
        <AdminBooksTable
          books={visible}
          empty={
            missing ? (
              "Nothing to fix"
            ) : query ? (
              <EmptyRow title={`No books match “${query}”`} clearHref="/admin/books" />
            ) : category ? (
              <EmptyRow title={`No books in ${category}`} clearHref="/admin/books" clearLabel="Show all books" />
            ) : (
              "No books yet"
            )
          }
        />
        <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={matches.length}
            pathname="/admin/books"
            params={{ q: query || undefined, category, missing }}
          />
        </div>
      </div>
    </main>
  );
}
