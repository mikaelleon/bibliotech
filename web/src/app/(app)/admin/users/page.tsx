import { AdminUsersTable } from "@/components/admin-users-table";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SectionTabs } from "@/components/section-tabs";
import { Button } from "@/components/ui/button";
import { adminListUsers, isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

const pageSize = 25;

export const metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const requested = Number(params.page ?? "1");
  const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;
  const result = await adminListUsers(session, query, pageSize, (page - 1) * pageSize);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <div>
        <PageHeader title="Users" lede="Role changes arrive in Phase 2." />
        <SectionTabs />
      </div>
      <form action="/admin/users" className="flex flex-col gap-3 md:flex-row">
        <label className="grid min-w-0 flex-1 gap-2">
          <span className="sr-only">Search by name or email</span>
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by name or email"
            className="h-11 rounded-full border border-border bg-card px-4 text-base"
          />
        </label>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      <div>
        <AdminUsersTable rows={result.rows} />
        <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={result.total}
            pathname="/admin/users"
            params={{ q: query || undefined }}
          />
        </div>
      </div>
    </main>
  );
}
