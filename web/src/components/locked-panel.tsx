import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const copy: Record<string, string> = {
  Library: "Library keeps the books you want to come back to. Adding one doesn’t use a download.",
  Favorites: "Favorites keeps the books you mark with a heart.",
  Profile: "An account holds your name, password, and theme.",
};

/** Guest view for Library, Favorites, and Profile. Stays inside the shell. */
export function LockedPanel({ title }: { title: string }) {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
      <h1 className="page-title">{title}</h1>
      <div className="mt-6 max-w-[560px]">
        <Lock size={24} strokeWidth={1.5} aria-hidden className="text-muted-foreground" />
        <h2 className="section-title mt-4">Create a free account to unlock this</h2>
        <p className="mt-2 max-w-[560px] text-sm leading-5 text-muted-foreground md:text-base md:leading-normal">
          {copy[title] ?? "Create a free account to use this page."} An account also raises your limit from 5 to 10 downloads.
        </p>
        <div className="mt-6 flex flex-col items-start gap-3">
          <Button asChild className="w-full md:w-auto">
            <Link href="/register">
              Register
              <ArrowRight strokeWidth={1.5} />
            </Link>
          </Button>
          <Link href="/login" className="text-sm leading-5 text-brand-text underline">
            I already have an account
          </Link>
        </div>
      </div>
    </main>
  );
}
