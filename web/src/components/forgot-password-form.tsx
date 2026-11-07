"use client";

import Link from "next/link";
import { useState } from "react";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { requestPasswordResetAction } from "@/lib/actions";
import { emailPattern } from "@/lib/auth-rules";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, setPending] = useState(false);

  async function send(address: string) {
    if (!emailPattern.test(address)) {
      setError("Enter a valid email, like name@example.com.");
      return;
    }
    setPending(true);
    const result = await requestPasswordResetAction(address);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setSent(address);
    setCooldown(30);
    const timer = window.setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  if (sent) {
    return (
      <div className="mt-8">
        <h1 className="page-title">Check your email</h1>
        <p className="mt-2 text-base leading-6 text-muted-foreground">
          If an account exists for {sent}, a reset link is on its way.
        </p>
        <p className="mt-6 text-sm leading-5">
          {cooldown > 0 ? (
            <span className="text-muted-foreground">Resend email in {cooldown}s</span>
          ) : (
            <Button type="button" variant="outline" disabled={pending} onClick={() => void send(sent)}>
              Resend email
            </Button>
          )}
        </p>
        <p className="mt-4 text-sm leading-5">
          <Link href="/login" className="text-brand-text underline">
            Back to login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
    <h1 className="page-title mt-8">Reset your password</h1>
    <p className="mt-2 text-base leading-6 text-muted-foreground">
      {"Enter the email on your account. You'll get the same message either way."}
    </p>
    <form
      className="mt-6 grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void send(email.trim());
      }}
    >
      <Field label="Email" name="email" type="email" autoComplete="email" value={email} onChange={setEmail} error={error ?? undefined} />
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Sending" : "Send reset link"}
      </Button>
      <p className="text-sm leading-5">
        <Link href="/login" className="text-brand-text underline">
          Back to login
        </Link>
      </p>
    </form>
    </>
  );
}
