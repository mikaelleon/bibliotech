import { AdminDownloadsTable } from "@/components/admin-downloads-table";
import { PageHeader } from "@/components/page-header";
import { SectionTabs } from "@/components/section-tabs";
import { isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

export const metadata = { title: "Downloads" };

export default async function AdminDownloadsPage() {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <div>
        <PageHeader title="Downloads" lede="A record of files people have taken from the catalog." />
        <SectionTabs />
      </div>
      <AdminDownloadsTable rows={[]} />
    </main>
  );
}
