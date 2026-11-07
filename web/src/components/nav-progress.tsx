"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Changes faster than this never show the bar, so quick navigations stay clean. */
const SHOW_AFTER = 120;

type State = "idle" | "loading" | "done";

/**
 * A 2px bar at the top while a page change is in flight. It appears only after 120ms, grows
 * toward 85% while waiting, then fills and fades when the new page commits. It answers "did my
 * click register?" on slow loads without adding anything to fast ones.
 */
export function NavProgress() {
  const pathname = usePathname();
  const params = useSearchParams();
  const url = `${pathname}?${params.toString()}`;
  const [state, setState] = useState<State>("idle");
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a");
      if (!anchor || !anchor.href || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;
      const next = new URL(anchor.href, window.location.href);
      if (next.origin !== window.location.origin) return;
      if (next.pathname === window.location.pathname && next.search === window.location.search) return;
      startedAt.current = performance.now();
      setState("loading");
    }

    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (startedAt.current === null) return;
    const shown = performance.now() - startedAt.current >= SHOW_AFTER;
    startedAt.current = null;
    // Fast changes go straight back to idle; slow ones fill the bar, then fade it out.
    const finish = window.setTimeout(() => setState(shown ? "done" : "idle"), 0);
    const reset = shown ? window.setTimeout(() => setState("idle"), 300) : undefined;
    return () => {
      window.clearTimeout(finish);
      if (reset) window.clearTimeout(reset);
    };
  }, [url]);

  if (state === "idle") return null;
  return <div aria-hidden className="nav-progress" data-state={state} />;
}
