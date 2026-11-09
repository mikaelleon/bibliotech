import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms and Conditions" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-[640px] px-4 py-12">
      <h1 className="page-title">Terms and Conditions</h1>
      <div className="mt-6 grid gap-4 text-base leading-6">
        <p>A Bibliotech account is for reading the catalog. The books offered for download are in the public domain.</p>
        <p>The first time you save a book, it uses one download. Saving that same book again, on this device or another, does not use another download. Removing a file from a device does not give the download back.</p>
        <p>A new account can save 5 books in a month. Verifying the email raises that to 10. The count resets each month.</p>
        <p>
          The <Link href="/privacy" className="text-brand-text underline">Privacy Policy</Link> explains what the account stores.
        </p>
      </div>
    </main>
  );
}
