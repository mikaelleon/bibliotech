"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Swap } from "@/components/swap";

/** How long a button shows "Saved" after a successful save. */
const SAVED_FOR = 1500;

/** Button label that crossfades idle → pending → saved, keeping the button's width fixed. */
export function SaveLabel({
  pending,
  saved,
  idle,
  busy,
  done = "Saved",
}: {
  pending: boolean;
  saved: boolean;
  idle: string;
  busy: string;
  done?: string;
}) {
  const index = pending ? 1 : saved ? 2 : 0;
  return (
    <Swap
      index={index}
      items={[
        idle,
        busy,
        <>
          <Check strokeWidth={1.5} aria-hidden />
          {done}
        </>,
      ]}
    />
  );
}

/** `flash()` turns `saved` on for 1.5s. Call it after the save succeeds. */
export function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const flash = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    setSaved(true);
    timer.current = window.setTimeout(() => setSaved(false), SAVED_FOR);
  }, []);

  return { saved, flash };
}
