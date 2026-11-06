import { BookOpen } from "lucide-react";
import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="serif inline-flex min-h-11 items-center gap-2 text-xl leading-7 no-underline">
      <BookOpen size={20} strokeWidth={1.5} aria-hidden />
      E-Library AI
    </Link>
  );
}
