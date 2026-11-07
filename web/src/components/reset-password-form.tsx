"use client";

import Link from "next/link";
import { useState } from "react";

import { ErrorPanel } from "@/components/error-panel";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { resetPasswordAction } from "@/lib/actions";
import { passwordProblem } from "@/lib/auth-rules";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [expired, setExpired] = useState(false);

  if (!token || expired) {
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
            <Link href="/login">Back to login</Link>
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
      onSubmit={async (event) => {
        event.preventDefault();
        const problem = passwordProblem(password);
        if (problem) {
          setError(problem);
          return;
        }
        if (password !== confirm) {
          setError("Those passwords don't match.");
          return;
        }
        setPending(true);
        const message = await resetPasswordAction(token, password, confirm);
        setPending(false);
        if (message?.includes("expired")) {
          setExpired(true);
          return;
        }
        if (message) {
          setError(message);
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
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Updating" : "Update password"}
      </Button>
    </form>
  );
}
