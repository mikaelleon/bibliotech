import Link from "next/link";

import { LoginForm } from "@/app/login/login-form";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-4 pt-12 pb-16 md:pt-16">
      <Wordmark />
      <h1 className="serif mt-8 text-[32px] leading-10">Log in</h1>
      <p className="mt-2 text-muted-foreground">Pick up where you left off.</p>
      <LoginForm />
      <p className="mt-6 text-sm leading-5 text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-brand-text underline underline-offset-4">
          Create an account
        </Link>
      </p>
      <Button asChild variant="link" className="mt-1 text-sm">
        <Link href="/guest">Continue as guest</Link>
      </Button>
    </main>
  );
}
