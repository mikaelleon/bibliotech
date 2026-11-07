import { AdminDownloadsTable } from "@/components/admin-downloads-table";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SectionTabs } from "@/components/section-tabs";
import { adminListDownloads, isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

const pageSize = 25;

export const metadata = { title: "Downloads" };

export default async function AdminDownloadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  const params = await searchParams;
  const requested = Number(params.page ?? "1");
  const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;
  const result = await adminListDownloads(session, pageSize, (page - 1) * pageSize);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 py-6 md:px-8 md:py-8">
      <div>
        <PageHeader title="Downloads" lede="A record of files people have taken from the catalog." />
        <SectionTabs />
      </div>
      <div>
        <AdminDownloadsTable rows={result.rows} />
        {result.total > 0 ? (
          <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card">
            <Pagination page={page} pageSize={pageSize} total={result.total} pathname="/admin/downloads" params={{}} />
          </div>
        ) : null}
      </div>
    </main>
  );
}
