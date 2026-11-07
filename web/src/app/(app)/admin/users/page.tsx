import Link from "next/link";

import { AdminUsersFilters } from "@/components/admin-users-filters";
import { AdminUsersTable } from "@/components/admin-users-table";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { adminListUsers, isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

const pageSize = 25;

export const metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; role?: string; type?: string }>;
}) {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const role = params.role === "user" || params.role === "admin" ? params.role : undefined;
  const type = params.type === "registered" || params.type === "guest" ? params.type : undefined;
  const requested = Number(params.page ?? "1");
  const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;
  const result = await adminListUsers(session, query, pageSize, (page - 1) * pageSize, { role, type });

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Users"
        action={
          <Button asChild>
            <Link href="/admin/users/new">Create user</Link>
          </Button>
        }
      />
      <AdminUsersFilters query={query} role={role} type={type} />
      <div>
        <AdminUsersTable
          rows={result.rows}
          empty={type === "guest" ? "Guest sessions are not stored as accounts." : "No users match that search."}
        />
        <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={result.total}
            pathname="/admin/users"
            params={{ q: query || undefined, role, type }}
          />
        </div>
      </div>
    </main>
  );
}
