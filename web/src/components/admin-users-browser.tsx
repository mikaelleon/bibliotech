"use client";

import { useState } from "react";

import { AdminUsersFilters } from "@/components/admin-users-filters";
import { AdminUsersTable, type UserRow } from "@/components/admin-users-table";
import { EmptyRow } from "@/components/empty-row";
import { Pagination } from "@/components/pagination";
import { replaceSearch } from "@/lib/replace-search";

const pageSize = 25;

/** Role, type, and search filter the users table without sending the page back to the top. */
export function AdminUsersBrowser({
  rows,
  query,
  role,
  type,
  page,
}: {
  rows: UserRow[];
  query: string;
  role?: string;
  type?: string;
  page: number;
}) {
  const [currentQuery, setQuery] = useState(query);
  const [currentRole, setRole] = useState(role ?? "");
  const [currentType, setType] = useState(type ?? "");
  const [currentPage, setPage] = useState(page);
  const [formKey, setFormKey] = useState(0);
  const signature = `${query}|${role ?? ""}|${type ?? ""}|${page}`;
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setQuery(query);
    setRole(role ?? "");
    setType(type ?? "");
    setPage(page);
    setFormKey((key) => key + 1);
  }

  const needle = currentQuery.trim().toLowerCase();
  const matches = rows.filter((user) => {
    if (currentRole && user.role !== currentRole) return false;
    if (currentType === "registered" && user.tier !== "Registered") return false;
    if (currentType === "guest" && user.tier !== "Guest (unverified)") return false;
    if (!needle) return true;
    return user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle);
  });
  const visible = matches.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function apply(next: { q: string; role: string; type: string }) {
    setQuery(next.q);
    setRole(next.role);
    setType(next.type);
    setPage(1);
    replaceSearch({ q: next.q || null, role: next.role || null, type: next.type || null, page: null });
  }

  function clear() {
    setQuery("");
    setRole("");
    setType("");
    setPage(1);
    setFormKey((key) => key + 1);
    replaceSearch({ q: null, role: null, type: null, page: null });
  }

  function selectPage(next: number) {
    setPage(next);
    replaceSearch({ page: next > 1 ? String(next) : null });
    window.scrollTo(0, 0);
  }

  return (
    <>
      <AdminUsersFilters key={formKey} query={currentQuery} role={currentRole || undefined} type={currentType || undefined} onApply={apply} />
      <div>
        <AdminUsersTable
          rows={visible}
          empty={
            currentType === "guest" ? (
              <EmptyRow title="No unverified accounts" onClear={clear} clearLabel="Show all users" />
            ) : currentQuery ? (
              <EmptyRow title={`No users match “${currentQuery}”`} onClear={clear} />
            ) : currentRole ? (
              <EmptyRow title="No users with that role" onClear={clear} clearLabel="Show all users" />
            ) : (
              "No users yet"
            )
          }
        />
        <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card">
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={matches.length}
            pathname="/admin/users"
            params={{ q: currentQuery || undefined, role: currentRole || undefined, type: currentType || undefined }}
            onPage={selectPage}
          />
        </div>
      </div>
    </>
  );
}
