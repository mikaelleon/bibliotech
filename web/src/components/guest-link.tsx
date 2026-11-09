"use client";

import { useRouter } from "next/navigation";
import { useState, type MouseEvent, type ReactNode } from "react";

import { setGuestFlight, type GuestMark } from "@/lib/guest-flight";
import { prefersReducedMotion } from "@/lib/motion";

function destination(href: string): string {
  const next = new URL(href, window.location.origin).searchParams.get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/browse";
}

function markBox(element: HTMLElement): GuestMark {
  const box = element.getBoundingClientRect();
  return { left: box.left, top: box.top, width: box.width, height: box.height };
}

/**
 * Starts the landing exit, asks /guest to set the session, then opens the app.
 * The route still redirects for a normal visit. This path asks for JSON so the
 * page can stay up until the session exists, instead of a hard reload.
 */
export function GuestLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function prefetch(dest: string) {
    router.prefetch(dest);
  }

  async function go(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setError(null);
    const anchor = event.currentTarget;
    const rect = anchor.getBoundingClientRect();
    const root = document.querySelector<HTMLElement>("[data-landing]");
    if (root && !prefersReducedMotion()) {
      const box = root.getBoundingClientRect();
      root.style.setProperty("--guest-x", `${rect.left + rect.width / 2 - box.left}px`);
      root.style.setProperty("--guest-y", `${rect.top + rect.height / 2 - box.top}px`);
      root.classList.add("guest-leave");
    }
    const mark = document.querySelector<HTMLElement>('[data-wordmark="brand"]');
    const destHint = destination(anchor.href);
    setGuestFlight({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      from: mark ? markBox(mark) : null,
      at: performance.now(),
    });
    prefetch(destHint);
    try {
      const response = await fetch(anchor.href, {
        headers: { accept: "application/json" },
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { next?: string };
      const dest = body.next && body.next.startsWith("/") && !body.next.startsWith("//") ? body.next : destHint;
      prefetch(dest);
      document.documentElement.dataset.guestArrive = "1";
      router.push(dest);
    } catch {
      setGuestFlight(null);
      delete document.documentElement.dataset.guestArrive;
      root?.classList.remove("guest-leave");
      setError("The guest session didn't start. Try again.");
    }
  }

  return (
    <>
      <a
        href={href}
        className={className}
        onClick={go}
        onPointerEnter={() => prefetch(destination(href))}
      >
        {children}
      </a>
      {error ? (
        <span role="alert" className="mt-1 block text-sm leading-5 text-brand-text">
          {error}
        </span>
      ) : null}
    </>
  );
}
