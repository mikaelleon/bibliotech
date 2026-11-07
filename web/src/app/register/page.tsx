import Link from "next/link";

import { RegisterForm } from "@/app/register/register-form";
import { Wordmark } from "@/components/wordmark";
import { redirectSignedInFromAuth } from "@/lib/access";
import { safeNext } from "@/lib/auth-rules";

export const metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNext(rawNext);
  await redirectSignedInFromAuth(next ?? undefined);
  const carry = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <main className="mx-auto max-w-sm px-4 pt-12 pb-16 md:pt-16">
      <Wordmark />
      <h1 className="page-title mt-8">Create an account</h1>
      <p className="mt-2 text-muted-foreground">Free. Get 10 downloads, a library and favorites.</p>
      <RegisterForm next={next} />
      <p className="mt-6 text-sm leading-5 text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/login${carry}`} className="font-medium text-brand-text underline">
          Log in
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
