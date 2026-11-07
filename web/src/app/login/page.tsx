import Link from "next/link";

import { LoginForm } from "@/app/login/login-form";
import { Wordmark } from "@/components/wordmark";
import { redirectSignedInFromAuth } from "@/lib/access";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  await redirectSignedInFromAuth();
  return (
    <main className="mx-auto max-w-sm px-4 pt-12 pb-16 md:pt-16">
      <Wordmark />
      <h1 className="serif mt-8 text-[32px] leading-10">Log in</h1>
      <p className="mt-2 text-muted-foreground">Pick up where you left off.</p>
      <LoginForm />
      <p className="mt-6 text-sm leading-5 text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-brand-text underline">
          Register
        </Link>
      </p>
      <p className="mt-2 text-sm leading-5">
        <Link href="/guest" className="text-muted-foreground underline">
          Continue as guest
        </Link>
      </p>
    </main>
  );
}
