import Link from "next/link";

import { AdminDownloadsTable } from "@/components/admin-downloads-table";
import { PageHeader } from "@/components/page-header";
import { StatRow } from "@/components/stat-row";
import { adminStats, isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

export const metadata = { title: "Dashboard" };

function attentionLabel(count: number, what: string): string {
  return `${count} ${count === 1 ? "book is" : "books are"} missing ${what}`;
}

export default async function AdminPage() {
  const session = await getSession();
  if (!isAdminSession(session)) return null;
  const stats = await adminStats(session);
  const clear = stats.missingCovers === 0 && stats.missingLicenses === 0;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Dashboard" />
      <StatRow
        items={[
          { label: "Books", value: String(stats.books), context: "In the catalog" },
          { label: "Registered users", value: String(stats.registeredUsers), context: `Verified email. ${stats.guestUsers} unverified` },
          { label: "Downloads", value: String(stats.downloads), context: `${stats.downloadsLast30Days} in the last 30 days` },
        ]}
      />
      <section aria-labelledby="needs-attention">
        <h2 id="needs-attention" className="text-xl leading-7 font-medium">
          Needs attention
        </h2>
        {clear ? (
          <p className="mt-4 text-sm leading-5 text-muted-foreground">Nothing to fix</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {stats.missingCovers > 0 ? (
              <li>
                <Link href="/admin/books?missing=cover" className="text-sm leading-5 text-brand-text underline">
                  {attentionLabel(stats.missingCovers, "a cover")}
                </Link>
              </li>
            ) : null}
            {stats.missingLicenses > 0 ? (
              <li>
                <Link href="/admin/books?missing=license" className="text-sm leading-5 text-brand-text underline">
                  {attentionLabel(stats.missingLicenses, "a license")}
                </Link>
              </li>
            ) : null}
          </ul>
        )}
      </section>
      <section aria-labelledby="latest-registrations" className="grid gap-6">
        <h2 id="latest-registrations" className="text-xl leading-7 font-medium">
          Latest registrations
        </h2>
        {stats.latestUsers.length === 0 ? (
          <p className="text-sm leading-5 text-muted-foreground">No accounts yet</p>
        ) : (
          <ul className="stagger overflow-hidden rounded-xl bg-card">
            {stats.latestUsers.map((user) => (
              <li key={user.id}>
                <Link
                  href={`/admin/users/${encodeURIComponent(user.id)}`}
                  className="hover-fill block px-4 py-3 no-underline hover:bg-background"
                >
                  <span>
                    <span className="block text-sm leading-5">{user.name}</span>
                    <span className="block text-sm leading-5 text-muted-foreground">{user.email}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="latest-downloads" className="grid gap-6">
        <h2 id="latest-downloads" className="text-xl leading-7 font-medium">
          Latest downloads
        </h2>
        <AdminDownloadsTable rows={stats.recentDownloads} />
      </section>
    </main>
  );
}
