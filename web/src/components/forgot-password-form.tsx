"use client";

import Link from "next/link";
import { useState } from "react";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  function send(address: string) {
    if (!emailPattern.test(address)) {
      setError("Enter a valid email, like name@example.com.");
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
        <h1 className="serif text-[32px] leading-10 font-light">Check your email</h1>
        <p className="mt-2 text-base leading-6 text-muted-foreground">
          If an account exists for {sent}, a reset link is on its way.
        </p>
        <p className="mt-6 text-sm leading-5">
          {cooldown > 0 ? (
            <span className="text-muted-foreground">Resend email in {cooldown}s</span>
          ) : (
            <button type="button" className="text-brand-text underline underline-offset-4" onClick={() => send(sent)}>
              Resend email
            </button>
          )}
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm leading-5 text-brand-text underline underline-offset-4">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <>
    <h1 className="serif mt-8 text-[32px] leading-10 font-light">Reset your password</h1>
    <p className="mt-2 text-base leading-6 text-muted-foreground">
      {"Enter the email on your account. You'll get the same message either way."}
    </p>
    <form
      className="mt-6 grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        send(email.trim());
      }}
    >
      <Field label="Email" name="email" type="email" autoComplete="email" value={email} onChange={setEmail} error={error ?? undefined} />
      <Button type="submit">Send reset link</Button>
      <Link href="/login" className="text-sm leading-5 text-brand-text underline underline-offset-4">
        Back to Login
      </Link>
    </form>
    </>
  );
}
