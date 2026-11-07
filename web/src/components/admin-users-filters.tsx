"use client";

import { Field } from "@/components/field";
import { Select } from "@/components/ui/select";

export function AdminUsersFilters({
  query,
  role,
  type,
}: {
  query: string;
  role?: string;
  type?: string;
}) {
  return (
    <form action="/admin/users" className="grid gap-4 md:grid-cols-3 md:items-end">
      <Field label="Search by name or email" name="q" defaultValue={query} />
      <label className="grid text-sm font-medium leading-5">
        <span className="mb-1">Role</span>
        <Select name="role" defaultValue={role ?? ""} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
          <option value="">All roles</option>
          <option value="user">Reader</option>
          <option value="admin">Administrator</option>
        </Select>
      </label>
      <label className="grid text-sm font-medium leading-5">
        <span className="mb-1">Type</span>
        <Select name="type" defaultValue={type ?? ""} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
          <option value="">All types</option>
          <option value="registered">Registered</option>
          <option value="guest">Guest</option>
        </Select>
      </label>
    </form>
  );
}
