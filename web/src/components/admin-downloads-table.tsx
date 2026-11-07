"use client";

import { DataTable } from "@/components/data-table";

export type DownloadRow = { id: string; who: string; book: string; date: string; times?: number };

/** Column renderers stay in this client component so the server page only passes data. */
export function AdminDownloadsTable({ rows }: { rows: DownloadRow[] }) {
  return (
    <DataTable
      caption="Downloads"
      empty="No downloads yet"
      rows={rows}
      columns={[
        { key: "who", header: "User", cell: (row) => row.who },
        { key: "book", header: "Book", cell: (row) => row.book },
        { key: "date", header: "Last downloaded", cell: (row) => shortDate(row.date) },
        { key: "times", header: "Times", cell: (row) => row.times ?? 1 },
      ]}
    />
  );
}

function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
