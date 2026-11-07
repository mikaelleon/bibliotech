"use client";

import { useState } from "react";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

/** The form is reviewable. Creating the account arrives in Phase 2. */
export function CreateUserForm() {
  const [method, setMethod] = useState("invite");

  return (
    <form
      className="grid max-w-[640px] gap-4"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <Field label="Email" name="email" type="email" autoComplete="off" />
      <Field label="Display name" name="name" autoComplete="off" />
      <label className="grid gap-2 text-sm leading-5" htmlFor="role">
        Role
        <Select id="role" name="role" defaultValue="user">
          <option value="user">Reader</option>
          <option value="admin">Administrator</option>
        </Select>
      </label>
      <label className="grid gap-2 text-sm leading-5" htmlFor="method">
        How they sign in
        <Select id="method" name="method" value={method} onChange={(event) => setMethod(event.currentTarget.value)}>
          <option value="invite">Send an invite email</option>
          <option value="password">Set an initial password</option>
        </Select>
      </label>
      {method === "password" ? (
        <Field label="Initial password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters." />
      ) : (
        <p className="text-sm leading-5 text-muted-foreground">
          An invite email lets them choose a password. You never see it.
        </p>
      )}
      <div className="mt-2 flex justify-end">
        <Button type="submit" disabled>
          Create user
        </Button>
      </div>
      <p className="text-sm leading-5 text-muted-foreground">Arrives in Phase 2.</p>
    </form>
  );
}
