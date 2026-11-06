import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Guest view for Library, Favorites, and Profile. Stays inside the shell. */
export function LockedPanel({ title }: { title: string }) {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
      <h1 className="serif text-[32px] leading-10">{title}</h1>
      <div className="mt-6 max-w-[720px] rounded-xl border border-border bg-card p-6 md:p-8">
        <Lock size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />
        <h2 className="serif mt-4 text-2xl leading-8">Create a free account to unlock this.</h2>
        <p className="mt-2 max-w-[560px] text-sm leading-5 text-muted-foreground md:text-base md:leading-normal">
          My Library keeps every book you download in one place. An account also adds Favorites and raises your limit from 5 to 10 downloads.
        </p>
        <div className="mt-6 flex flex-col md:flex-row md:items-center md:gap-6">
          <Button asChild className="w-full md:w-auto">
            <Link href="/register">
              Register
              <ArrowRight strokeWidth={1.5} />
            </Link>
          </Button>
          <Button asChild variant="link" className="mt-2 text-sm md:mt-0">
            <Link href="/login">I already have an account</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
