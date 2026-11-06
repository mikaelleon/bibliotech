"use client";

import Link from "next/link";

import { Dialog } from "@/components/dialog";
import { Button } from "@/components/ui/button";

/** Guest and registered download-limit notices. Phase 1 opens this from the state gallery only. */
export function LimitDialog({
  open,
  onOpenChange,
  guest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={guest ? "You've used your 5 guest downloads" : "You've used all 10 downloads"}
      footer={
        guest ? (
          <>
            <Button asChild variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
          </>
        ) : (
          <Button asChild>
            <Link href="/browse">Back to Browse</Link>
          </Button>
        )
      }
    >
      {guest
        ? "Create a free account to get 10 downloads."
        : "Your account has reached its download limit."}
    </Dialog>
  );
}
