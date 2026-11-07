"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Commits a hover only after the pointer rests for `delay` ms, so sweeping across a row of items
 * doesn't fire for every one it passes. `cancel` drops a pending hover (call it on mouse leave).
 */
export function useHoverIntent<T>(commit: (value: T) => void, delay = 80) {
  const timer = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const enter = useCallback(
    (value: T) => {
      cancel();
      timer.current = window.setTimeout(() => commit(value), delay);
    },
    [cancel, commit, delay],
  );

  useEffect(() => cancel, [cancel]);

  return { enter, cancel };
}
