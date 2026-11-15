"use client";

import { DataTable } from "@/components/data-table";

export type AuditTableRow = { id: string; at: string; admin: string; action: string; target: string };

/** Column renderers stay in this client component so the server page only passes data. */
export function AdminAuditTable({ rows }: { rows: AuditTableRow[] }) {
  return (
    <DataTable
      caption="Admin activity"
      empty="No activity yet"
      rows={rows}
      columns={[
        { key: "at", header: "When", cell: (row) => when(row.at) },
        { key: "admin", header: "Administrator", cell: (row) => row.admin },
        { key: "action", header: "Action", cell: (row) => row.action },
        { key: "target", header: "Account", cell: (row) => row.target || "None" },
      ]}
    />
  );
}

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC`;
}
