"use client";

import { Heart, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Dialog } from "@/components/dialog";
import { FavoriteButton } from "@/components/favorite-button";
import { Button } from "@/components/ui/button";

/** Heart on a card. Guests get a sign-up prompt. Signed-in readers toggle the favorite. */
export function CardFavorite({
  bookId,
  active,
  signedIn,
}: {
  bookId: string;
  active: boolean;
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (signedIn) return <FavoriteButton bookId={bookId} active={active} overlay />;

  return (
    <>
      <button
        type="button"
        aria-label="Favorite, requires an account"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className="press relative inline-flex size-11 items-center justify-center rounded-full bg-card"
      >
        <Heart size={20} strokeWidth={1.5} aria-hidden />
        <Lock size={12} strokeWidth={1.5} aria-hidden className="absolute top-0 right-0 text-muted-foreground" />
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Create a free account to save favorites"
        footer={
          <>
            <Button asChild variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
          </>
        }
      >
        Favorites keeps the books you mark with a heart.
      </Dialog>
    </>
  );
}
