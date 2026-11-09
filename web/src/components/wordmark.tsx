import Link from "next/link";

import { cn } from "@/lib/utils";

/** Brand mark. The accent dot matches the verification email. Newsreader stays on book titles. */
export function Wordmark({
  href = "/",
  mark = "brand",
  className,
}: {
  href?: string;
  mark?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Bibliotech"
      data-wordmark={mark}
      className={cn("inline-flex min-h-11 items-center text-xl leading-7 font-semibold no-underline", className)}
    >
      Bibliotech
      <span className="text-brand" aria-hidden="true">.</span>
    </Link>
  );
}
