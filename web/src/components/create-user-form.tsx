"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { createUser } from "@/lib/admin-actions";

/** Invite by email (they choose the password) or set an initial one. */
export function CreateUserForm() {
  const [method, setMethod] = useState("invite");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="grid max-w-[640px] gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createUser({ email, name, role, method, password });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push(result.data ? `/admin/users/${result.data.id}` : "/admin/users");
        });
      }}
    >
      <Field label="Email" name="email" type="email" autoComplete="off" value={email} onChange={setEmail} />
      <Field label="Display name" name="name" autoComplete="off" value={name} onChange={setName} />
      <label className="grid gap-2 text-sm leading-5" htmlFor="role">
        Role
        <Select id="role" name="role" value={role} onChange={(event) => setRole(event.currentTarget.value)}>
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
        <Field
          label="Initial password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters. Share it privately."
          value={password}
          onChange={setPassword}
        />
      ) : (
        <p className="text-sm leading-5 text-muted-foreground">
          An invite email lets them choose a password. You never see it.
        </p>
      )}
      <div className="mt-2 flex justify-end">
        <Button type="submit" disabled={pending || !email.trim()}>
          {pending ? "Creating" : "Create user"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm leading-5 text-brand-text">
          {error}
        </p>
      ) : null}
    </form>
  );
}
