"use client";

import { DataTable } from "@/components/data-table";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  downloadsUsed: number;
};

/** Column renderers stay in this client component so the server page only passes data. */
export function AdminUsersTable({ rows }: { rows: UserRow[] }) {
  return (
    <DataTable
      caption="Users"
      empty="No users match that search."
      rows={rows}
      columns={[
        {
          key: "name",
          header: "Name",
          cell: (user) => (
            <span className="block">
              <span className="block text-sm leading-5">{user.name}</span>
              <span className="block text-sm leading-5 text-muted-foreground">{user.email}</span>
            </span>
          ),
        },
        { key: "role", header: "Role", cell: (user) => user.role },
        { key: "joined", header: "Joined", cell: () => "Not recorded" },
        {
          key: "downloads",
          header: "Downloads used",
          align: "right",
          cell: (user) => `${user.downloadsUsed} of 10`,
        },
      ]}
    />
  );
}
