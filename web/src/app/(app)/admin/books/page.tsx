import Link from "next/link";

import { AdminBooksBrowser } from "@/components/admin-books-browser";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { isAdminSession } from "@/lib/admin";
import { listCatalog } from "@/lib/catalog";
import { getSession } from "@/lib/session";
import { CATEGORIES, type Category } from "@/lib/types";

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
      <AdminBooksBrowser books={await listCatalog()} query={query} category={category} missing={missing} page={page} />
    </main>
  );
}
