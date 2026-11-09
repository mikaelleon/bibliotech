import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[640px] px-4 py-12">
      <h1 className="page-title">Privacy Policy</h1>
      <div className="mt-6 grid gap-4 text-base leading-6">
        <p>The account stores the display name, email, library, favorites, reading place, and download history. Download history records when a book was first saved, when it was last saved, and the device label, such as Web or Android.</p>
        <p>That record runs the library and the monthly download limit. It is not sold.</p>
        <p>
          Creating an account means you agree to these terms. The <Link href="/terms" className="text-brand-text underline">Terms and Conditions</Link> cover the download limit.
        </p>
      </div>
    </main>
  );
}
