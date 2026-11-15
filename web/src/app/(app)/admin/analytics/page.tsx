import Link from "next/link";

import { AdminDownloadsTable } from "@/components/admin-downloads-table";
import { BarList } from "@/components/bar-list";
import { DownloadChart } from "@/components/download-chart";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { RangeTabs } from "@/components/range-tabs";
import { StatRow } from "@/components/stat-row";
import { adminInsights, adminListDownloads, adminStats, isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

export const metadata = { title: "Analytics" };

const ranges = [7, 30, 90] as const;
const PAGE_SIZE = 25;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  const params = await searchParams;
  const requested = Number(params.range ?? "30");
  const days = requested === 7 || requested === 90 ? requested : 30;
  const [stats, insights] = await Promise.all([adminStats(session, days), adminInsights(session, days)]);
  const requestedPage = Number(params.page ?? "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const downloads = await adminListDownloads(session, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  const topTotal = stats.downloads || 1;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Analytics" />
      <RangeTabs ranges={ranges} days={days} />
      <StatRow
        items={[
          { label: `New downloads, ${days} days`, value: String(stats.downloadsInRange), context: "First time a reader saved a book" },
          { label: "Books downloaded", value: String(stats.downloads), context: "One per reader and book" },
          { label: "All saves", value: String(stats.downloadEvents), context: `${stats.repeatDownloads} were repeat saves` },
        ]}
      />
      <DownloadChart points={stats.downloadsPerDay} days={days} />
      <DownloadChart points={insights.signupsPerDay} days={days} noun="Signups" id="signups-chart" />
      <section aria-labelledby="funnel" className="grid gap-6">
        <h2 id="funnel" className="text-xl leading-7 font-medium">
          From signup to first download
        </h2>
        <BarList
          items={[
            { label: "Signed up", count: insights.funnel.signedUp },
            { label: "Verified email", count: insights.funnel.verified },
            { label: "Downloaded a book", count: insights.funnel.downloaded },
          ]}
        />
      </section>
      <StatRow
        items={[
          {
            label: "At download limit",
            value: String(insights.quota.atLimit),
            context: `${insights.quota.nearLimit} more are at 80% or more. ${insights.quota.readers} readers in all`,
          },
          {
            label: `Active readers, ${days} days`,
            value: String(insights.reading.activeReaders),
            context: `${insights.reading.booksRead} different books opened`,
          },
          {
            label: "Books with a file",
            value: `${insights.catalog.withFile} of ${insights.catalog.total}`,
            context: `${insights.catalog.withoutCover} have no cover`,
          },
        ]}
      />
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
                <li key={item.id || item.title} className="flex justify-between gap-4 text-sm leading-5">
                  <span>
                    {index + 1}.{" "}
                    {item.id ? (
                      <Link href={`/books/${item.id}`} className="text-inherit underline">
                        {item.title}
                      </Link>
                    ) : (
                      item.title
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {item.count} ({Math.round((item.count / topTotal) * 100)}%)
                  </span>
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
        <div>
          <AdminDownloadsTable rows={downloads.rows} />
          <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={downloads.total}
              pathname="/admin/analytics"
              params={{ range: days === 30 ? undefined : String(days) }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
