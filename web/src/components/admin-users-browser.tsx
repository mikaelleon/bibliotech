"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { AdminUsersFilters } from "@/components/admin-users-filters";
import { AdminUsersTable, type UserRow } from "@/components/admin-users-table";
import { EmptyRow } from "@/components/empty-row";
import { Pagination } from "@/components/pagination";

function href(next: { q?: string; role?: string; type?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.role) params.set("role", next.role);
  if (next.type) params.set("type", next.type);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

/**
 * One page of users, already filtered in SQL. Search, role, type and paging change the URL,
 * and the server returns the next page. The browser never holds the whole user list.
 */
export function AdminUsersBrowser({
  rows,
  total,
  pageSize,
  query,
  role,
  type,
  page,
}: {
  rows: UserRow[];
  total: number;
  pageSize: number;
  query: string;
  role?: string;
  type?: string;
  page: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const signature = `${query}|${role ?? ""}|${type ?? ""}`;

  function go(next: { q?: string; role?: string; type?: string; page?: number }) {
    startTransition(() => router.replace(href(next), { scroll: false }));
  }

  return (
    <>
      <AdminUsersFilters
        key={signature}
        query={query}
        role={role}
        type={type}
        onApply={(next) => go({ q: next.q, role: next.role, type: next.type })}
      />
      <div aria-busy={pending} className={pending ? "opacity-60" : undefined}>
        <AdminUsersTable
          rows={rows}
          empty={
            type === "guest" ? (
              <EmptyRow title="No unverified accounts" onClear={() => go({})} clearLabel="Show all users" />
            ) : query ? (
              <EmptyRow title={`No users match “${query}”`} onClear={() => go({})} />
            ) : role ? (
              <EmptyRow title="No users with that role" onClear={() => go({})} clearLabel="Show all users" />
            ) : (
              "No users yet"
            )
          }
        />
        <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            pathname="/admin/users"
            params={{ q: query || undefined, role, type }}
            onPage={(next) => {
              go({ q: query, role, type, page: next });
              window.scrollTo(0, 0);
            }}
          />
        </div>
      </div>
    </>
  );
}
