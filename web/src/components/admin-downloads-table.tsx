"use client";

import { DataTable } from "@/components/data-table";

export type DownloadRow = { id: string; who: string; book: string; date: string };

/** Column renderers stay in this client component so the server page only passes data. */
export function AdminDownloadsTable({ rows }: { rows: DownloadRow[] }) {
  return (
    <DataTable
      caption="Downloads"
      empty="No downloads have been recorded yet."
      rows={rows}
      columns={[
        { key: "who", header: "User", cell: (row) => row.who },
        { key: "book", header: "Book", cell: (row) => row.book },
        { key: "date", header: "Date", cell: (row) => row.date },
      ]}
    />
  );
}
