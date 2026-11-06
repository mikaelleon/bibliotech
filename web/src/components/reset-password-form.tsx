"use client";

import Link from "next/link";
import { useState } from "react";

import { ErrorPanel } from "@/components/error-panel";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm({ valid }: { valid: boolean }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!valid) {
    return (
      <ErrorPanel
        title="This reset link has expired"
        action={
          <Button asChild>
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        }
      >
        Ask for another link and open the newest email.
      </ErrorPanel>
    );
  }

  if (done) {
    return (
      <ErrorPanel
        title="Password updated"
        action={
          <Button asChild>
            <Link href="/login">Back to Login</Link>
          </Button>
        }
      >
        You can log in with the new password.
      </ErrorPanel>
    );
  }

  return (
    <form
      className="mt-6 grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (password.length < 8) {
          setError("Use at least 8 characters.");
          return;
        }
        if (password !== confirm) {
          setError("Those passwords don't match.");
          return;
        }
        setError(null);
        setDone(true);
      }}
    >
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        hint="At least 8 characters."
      />
      <Field
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
        error={error ?? undefined}
      />
      <Button type="submit">Update password</Button>
    </form>
  );
}
