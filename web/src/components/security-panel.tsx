"use client";

import { useState } from "react";

import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { updatePasswordAction } from "@/lib/actions";

export function SecurityPanel() {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setPending(true);
    const message = await updatePasswordAction(password, confirm);
    setPending(false);
    if (message) {
      setError(message);
      return;
    }
    setPassword("");
    setConfirm("");
    setError(null);
    toast("Password updated.");
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6" aria-labelledby="security-heading">
      <h2 id="security-heading" className="text-xl leading-7 font-medium">
        Security
      </h2>
      <label className="mt-4 grid gap-2 text-sm leading-5" htmlFor="new-password">
        New password
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 rounded-xl border border-border bg-background px-3 text-base"
        />
      </label>
      <label className="mt-4 grid gap-2 text-sm leading-5" htmlFor="confirm-password">
        Confirm password
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="h-11 rounded-xl border border-border bg-background px-3 text-base"
        />
      </label>
      {error ? <p className="mt-2 text-sm leading-5 text-brand-text">{error}</p> : null}
      <Button type="button" variant="outline" className="mt-4" onClick={() => void save()} disabled={pending}>
        {pending ? "Updating" : "Update password"}
      </Button>
    </section>
  );
}
