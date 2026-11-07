"use client";

import { MailCheck } from "lucide-react";
import { useState } from "react";

import { sendVerificationAction } from "@/lib/actions";

/** Quiet inline notice for unverified accounts. Never a modal. */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function send() {
    setPending(true);
    const result = await sendVerificationAction();
    setPending(false);
    setMessage(result.message);
  }

  return (
    <div className="flex items-start gap-3 rounded-xl bg-card p-6 text-sm leading-5" role="region" aria-label="Verify your email">
      <MailCheck size={20} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-foreground" />
      <div className="min-w-0 grid gap-2">
        <p className="text-foreground">Verify your email to raise your limit from 5 to 10 downloads a month</p>
        <p className="text-muted-foreground">We&apos;ll send a link to {email}.</p>
        <div>
          <button
            type="button"
            onClick={() => void send()}
            disabled={pending}
            className="min-h-11 font-medium text-brand-text underline disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send link"}
          </button>
        </div>
        {message ? (
          <p role="status" className="text-muted-foreground">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
