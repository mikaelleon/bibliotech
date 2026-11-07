import { AdminDownloadsTable } from "@/components/admin-downloads-table";
import { BarList } from "@/components/bar-list";
import { DownloadChart } from "@/components/download-chart";
import { PageHeader } from "@/components/page-header";
import { RangeTabs } from "@/components/range-tabs";
import { adminListDownloads, adminStats, isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

export const metadata = { title: "Analytics" };

const ranges = [7, 30, 90] as const;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  const params = await searchParams;
  const requested = Number(params.range ?? "30");
  const days = requested === 7 || requested === 90 ? requested : 30;
  const stats = await adminStats(session, days);
  const downloads = await adminListDownloads(session, 25, 0);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Analytics" />
      <RangeTabs ranges={ranges} days={days} />
      <DownloadChart points={stats.downloadsPerDay} days={days} />
      <div className="grid gap-6 md:grid-cols-2 md:gap-12">
        <section aria-labelledby="by-category">
          <h2 id="by-category" className="text-xl leading-7 font-medium">
            Books by category
          </h2>
          <div className="mt-6">
            <BarList items={stats.booksByCategory} />
          </div>
        </section>
        <section aria-labelledby="most-downloaded">
          <h2 id="most-downloaded" className="text-xl leading-7 font-medium">
            Top downloaded books
          </h2>
          {stats.mostDownloaded.length === 0 ? (
            <p className="mt-6 text-sm leading-5 text-muted-foreground">No downloads yet</p>
          ) : (
            <ol className="mt-6 grid gap-3">
              {stats.mostDownloaded.map((item, index) => (
                <li key={item.title} className="flex justify-between gap-4 text-sm leading-5">
                  <span>
                    {index + 1}. {item.title}
                  </span>
                  <span className="text-muted-foreground">{item.count}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      <section aria-labelledby="download-activity" className="grid gap-6">
        <h2 id="download-activity" className="text-xl leading-7 font-medium">
          Download activity
        </h2>
        <AdminDownloadsTable rows={downloads.rows} />
      </section>
    </main>
  );
}
