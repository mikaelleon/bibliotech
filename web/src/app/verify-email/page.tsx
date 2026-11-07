import Link from "next/link";

import { VerifyEmailBanner } from "@/components/verify-email-banner";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export const metadata = { title: "Verify your email", referrer: "no-referrer" as const };

const results: Record<string, { title: string; body: string; ok: boolean }> = {
  verified: {
    title: "Email verified",
    body: "Your account now has 10 downloads a month. Your library, favorites and history are unchanged.",
    ok: true,
  },
  already_verified: { title: "Email already verified", body: "This account was verified before. Nothing changed.", ok: true },
  used: { title: "This link was already used", body: "Each link works once. If your email still shows as unverified, send a new link.", ok: false },
  expired: { title: "This link has expired", body: "Links work for 24 hours. Send a new one.", ok: false },
  email_changed: {
    title: "This link is for an old address",
    body: "The email on this account changed after the link was sent. Send a link to the new address.",
    ok: false,
  },
  invalid: { title: "This link isn't valid", body: "Check that you opened the whole link from the email, or send a new one.", ok: false },
  error: { title: "We couldn't verify your email", body: "Something went wrong on our side. Try the link again in a moment.", ok: false },
};

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const result = results[status ?? ""] ?? results.invalid;
  const session = await getSession();
  const canResend = !result.ok && session.kind === "user" && !session.verified;

  return (
    <main className="mx-auto max-w-sm px-4 pt-12 pb-16 md:pt-16">
      <Wordmark />
      <h1 className="page-title mt-8">{result.title}</h1>
      <p className="mt-2 text-base leading-6 text-muted-foreground">{result.body}</p>
      {canResend && session.kind === "user" ? (
        <div className="mt-6">
          <VerifyEmailBanner email={session.email} />
        </div>
      ) : null}
      {!result.ok && session.kind !== "user" ? (
        <p className="mt-6 text-sm leading-5 text-muted-foreground">
          <Link href="/login?next=/profile" className="text-brand-text underline">
            Log in
          </Link>{" "}
          to send a new link.
        </p>
      ) : null}
      <div className="mt-8">
        <Button asChild>
          <Link href={session.kind === "user" ? "/browse" : "/login"}>{session.kind === "user" ? "Go to Browse" : "Log in"}</Link>
        </Button>
      </div>
    </main>
  );
}
