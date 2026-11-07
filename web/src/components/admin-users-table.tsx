"use client";

import Link from "next/link";

import { DataTable } from "@/components/data-table";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  downloadsUsed: number;
  status: string;
};

/** Column renderers stay in this client component so the server page only passes data. */
export function AdminUsersTable({
  rows,
  empty = "No users match that search.",
}: {
  rows: UserRow[];
  empty?: string;
}) {
  return (
    <DataTable
      caption="Users"
      empty={empty}
      rows={rows}
      hrefFor={(user) => `/admin/users/${encodeURIComponent(user.email)}`}
      columns={[
        {
          key: "name",
          header: "Name",
          cell: (user) => (
            <span className="block">
              <Link
                href={`/admin/users/${encodeURIComponent(user.email)}`}
                className="block text-sm leading-5 text-foreground no-underline"
              >
                {user.name}
              </Link>
              <span className="block text-sm leading-5 text-muted-foreground">{user.email}</span>
            </span>
          ),
        },
        { key: "role", header: "Role", cell: (user) => <RoleBadge role={user.role} /> },
        { key: "status", header: "Status", cell: (user) => user.status },
        { key: "joined", header: "Joined", cell: () => <span className="text-muted-foreground">Not recorded</span> },
        {
          key: "downloads",
          header: "Downloads used",
          cell: (user) => (user.role === "admin" ? "Not allowed" : <DownloadMeter used={user.downloadsUsed} />),
        },
      ]}
    />
  );
}

function RoleBadge({ role }: { role: string }) {
  const label = role === "admin" ? "Administrator" : "Reader";
  return (
    <span>{label}</span>
  );
}

function DownloadMeter({ used }: { used: number }) {
  const safe = Math.max(0, Math.min(10, used));
  return (
    <span className="inline-flex items-center gap-3 text-sm leading-5">
      <span>{safe} of 10</span>
      <span className="h-1 w-16 overflow-hidden rounded-full bg-border" aria-hidden>
        <i className="bar-grow block h-full bg-brand" style={{ width: `${(safe / 10) * 100}%` }} />
      </span>
    </span>
  );
}
