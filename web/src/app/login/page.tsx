import Link from "next/link";

import { LoginForm } from "@/app/login/login-form";
import { Wordmark } from "@/components/wordmark";
import { redirectSignedInFromAuth } from "@/lib/access";
import { safeNext } from "@/lib/auth-rules";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNext(rawNext);
  await redirectSignedInFromAuth(next ?? undefined);
  const carry = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <main className="mx-auto max-w-sm px-4 pt-12 pb-16 md:pt-16">
      <Wordmark />
      <h1 className="page-title mt-8">Log in</h1>
      <p className="mt-2 text-muted-foreground">Pick up where you left off.</p>
      <LoginForm next={next} />
      <p className="mt-6 text-sm leading-5 text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href={`/register${carry}`} className="font-medium text-brand-text underline">
          Register
        </Link>
      </p>
      <p className="mt-2 text-sm leading-5">
        <Link href={`/guest${carry}`} className="text-muted-foreground underline">
          Continue as guest
        </Link>
      </p>
    </main>
  );
}
