import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="serif inline-flex min-h-11 items-center text-xl leading-7 font-normal no-underline">
      E-Library AI
    </Link>
  );
}
