import Link from "next/link";

import { RegisterForm } from "@/app/register/register-form";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-sm px-4 pt-12 pb-16 md:pt-16">
      <Wordmark />
      <h1 className="serif mt-6 text-[32px] leading-10 md:mt-8">Create an account</h1>
      <p className="mt-2 text-muted-foreground">Free. Get 10 downloads, a library and favorites.</p>
      <RegisterForm />
      <p className="mt-6 text-sm leading-5 text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-text underline underline-offset-4">
          Log in
        </Link>
      </p>
      <Button asChild variant="link" className="mt-1 text-sm">
        <Link href="/guest">Continue as guest</Link>
      </Button>
    </main>
  );
}
