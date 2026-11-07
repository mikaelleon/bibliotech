import { AdminDownloadsTable } from "@/components/admin-downloads-table";
import { BarList } from "@/components/bar-list";
import { DownloadChart } from "@/components/download-chart";
import { PageHeader } from "@/components/page-header";
import { SectionTabs } from "@/components/section-tabs";
import { StatRow } from "@/components/stat-row";
import { adminStats, isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await getSession();
  if (!isAdminSession(session)) return null;
  const stats = await adminStats(session);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 py-6 md:px-8 md:py-8">
      <div>
        <PageHeader title="Admin dashboard" lede="A summary of the catalog and its use." />
        <SectionTabs />
      </div>
      <StatRow
        items={[
          { label: "Books", value: String(stats.books), context: "In the catalog" },
          { label: "Registered users", value: String(stats.registeredUsers), context: "Accounts with a password" },
          { label: "Guest sessions", value: String(stats.guestSessions), context: "Anonymous sessions are not stored yet" },
          { label: "Downloads", value: String(stats.downloads), context: `${stats.downloadsLast30Days} in the last 30 days` },
        ]}
      />
      <DownloadChart points={stats.downloadsPerDay} />
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6" aria-labelledby="by-category">
          <h2 id="by-category" className="text-xl leading-7 font-medium">
            Books by category
          </h2>
          <div className="mt-6">
            <BarList items={stats.booksByCategory} />
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card p-6" aria-labelledby="most-downloaded">
          <h2 id="most-downloaded" className="text-xl leading-7 font-medium">
            Most downloaded
          </h2>
          {stats.mostDownloaded.length === 0 ? (
            <p className="mt-6 text-sm leading-5 text-muted-foreground">No downloads yet.</p>
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
      <section aria-labelledby="recent-downloads" className="grid gap-6">
        <h2 id="recent-downloads" className="text-xl leading-7 font-medium">
          Recent downloads
        </h2>
        <AdminDownloadsTable rows={stats.recentDownloads} />
      </section>
    </main>
  );
}
