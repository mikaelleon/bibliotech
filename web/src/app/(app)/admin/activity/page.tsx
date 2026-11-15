import { AdminAuditTable } from "@/components/admin-audit-table";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { adminListAudit, isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

export const metadata = { title: "Activity log" };

const PAGE_SIZE = 25;

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  const requested = Number((await searchParams).page ?? "1");
  const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;
  const result = await adminListAudit(session, PAGE_SIZE, (page - 1) * PAGE_SIZE);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Activity log" lede="Which administrator looked at or changed which account. Names are shortened." />
      <div>
        <AdminAuditTable rows={result.rows} />
        <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card">
          <Pagination page={page} pageSize={PAGE_SIZE} total={result.total} pathname="/admin/activity" params={{}} />
        </div>
      </div>
    </main>
  );
}
