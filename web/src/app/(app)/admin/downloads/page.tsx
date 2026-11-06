import { DataTable } from "@/components/data-table";
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
      <DataTable
        caption="Downloads"
        empty="No downloads have been recorded yet."
        rows={[] as { id: string; who: string; book: string; date: string }[]}
        columns={[
          { key: "who", header: "User", cell: (row) => row.who },
          { key: "book", header: "Book", cell: (row) => row.book },
          { key: "date", header: "Date", cell: (row) => row.date },
        ]}
      />
    </main>
  );
}
