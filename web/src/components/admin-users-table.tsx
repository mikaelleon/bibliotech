"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { DataTable } from "@/components/data-table";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  joined: string;
  downloadsUsed: number;
  downloadLimit: number;
  status: string;
};

/** Column renderers stay in this client component so the server page only passes data. */
export function AdminUsersTable({
  rows,
  empty = "No users yet",
}: {
  rows: UserRow[];
  empty?: ReactNode;
}) {
  return (
    <DataTable
      caption="Users"
      empty={empty}
      rows={rows}
      hrefFor={(user) => `/admin/users/${encodeURIComponent(user.id)}`}
      columns={[
        {
          key: "name",
          header: "Name",
          cell: (user) => (
            <span className="block">
              <Link
                href={`/admin/users/${encodeURIComponent(user.id)}`}
                className="block text-sm leading-5 text-foreground no-underline"
              >
                {user.name}
              </Link>
              <span className="block text-sm leading-5 text-muted-foreground">{user.email}</span>
            </span>
          ),
        },
        { key: "role", header: "Role", cell: (user) => <RoleBadge role={user.role} /> },
        { key: "tier", header: "Type", cell: (user) => user.tier },
        { key: "joined", header: "Joined", cell: (user) => <span className="text-muted-foreground">{user.joined}</span> },
        {
          key: "downloads",
          header: "Downloads this month",
          cell: (user) =>
            user.role === "admin" ? "Not allowed" : <DownloadMeter used={user.downloadsUsed} limit={user.downloadLimit} />,
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

function DownloadMeter({ used, limit }: { used: number; limit: number }) {
  const safe = Math.max(0, Math.min(limit, used));
  return (
    <span className="inline-flex items-center gap-3 text-sm leading-5">
      <span>
        {safe} of {limit}
      </span>
      <span className="h-1 w-16 overflow-hidden rounded-full bg-border" aria-hidden>
        <i className="bar-grow block h-full bg-brand" style={{ width: `${limit ? (safe / limit) * 100 : 0}%` }} />
      </span>
    </span>
  );
}
