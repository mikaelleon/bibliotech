"use client";

import { useState } from "react";

import { Field } from "@/components/field";
import { SaveLabel, useSavedFlash } from "@/components/save-label";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { updatePasswordAction } from "@/lib/actions";

export function SecurityPanel() {
  const { toast } = useToast();
  const { saved, flash } = useSavedFlash();
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
    flash();
  }

  return (
    <section className="rounded-xl bg-card p-8" aria-labelledby="security-heading">
      <h2 id="security-heading" className="text-xl leading-7 font-medium">
        Security
      </h2>
      <div className="mt-4 grid gap-4">
        <Field
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          hint="At least 8 characters."
        />
        <Field
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          error={error ?? undefined}
        />
      </div>
      <Button type="button" className="mt-4" onClick={() => void save()} disabled={pending}>
        <SaveLabel pending={pending} saved={saved} idle="Update password" busy="Updating" done="Updated" />
      </Button>
    </section>
  );
}
