import Link from "next/link";

import { AdminUsersBrowser } from "@/components/admin-users-browser";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { adminListUsers, isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

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
  const result = await adminListUsers(session, "", 1000, 0);

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
      <AdminUsersBrowser rows={result.rows} query={query} role={role} type={type} page={page} />
    </main>
  );
}
