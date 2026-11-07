"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** Returns to the previous page, or Browse when this tab has no history. */
export function BackLink() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center gap-2 text-sm leading-5 text-muted-foreground"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/browse");
      }}
    >
      <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
      Back
    </button>
  );
}
