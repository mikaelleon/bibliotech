"use client";

import { BookOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useRef, type ReactNode } from "react";

import { AccountMenu } from "@/components/account-menu";
import { CollectionPickerHost } from "@/components/add-to-library";
import { ProgressFlush } from "@/components/progress-flush";
import { AIAssistant } from "@/components/ai-assistant";
import { OfflineBanner } from "@/components/offline-banner";
import { QuotaMeter } from "@/components/quota-meter";
import { SearchBar } from "@/components/search-bar";
import { ShelfProvider } from "@/components/shelf-provider";
import { ShellSearch } from "@/components/shell-search";
import { SideRail } from "@/components/side-rail";
import { TabBar } from "@/components/tab-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToastProvider } from "@/components/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Wordmark } from "@/components/wordmark";
import { clearGuestFlight, peekGuestFlight } from "@/lib/guest-flight";
import { durMove, durPanel, easeInOut, easeOut, prefersReducedMotion, stagger } from "@/lib/motion";
import type { Session } from "@/lib/types";

type Shelves = { favoriteIds: string[]; libraryIds: string[]; libraryAddedAt: Record<string, string> };

const noShelves: Shelves = { favoriteIds: [], libraryIds: [], libraryAddedAt: {} };

export function AppShell({
  session,
  shelves = noShelves,
  children,
}: {
  session: Session;
  shelves?: Shelves;
  children: ReactNode;
}) {
  const path = usePathname();
  const shellRef = useRef<HTMLDivElement>(null);
  const onBook = path.startsWith("/books/");
  const admin = session.kind === "user" && session.role === "admin";
  const reader = session.kind === "guest" || (session.kind === "user" && !admin);
  const lockedPage = path === "/library" || path === "/favorites" || path === "/profile";

  useEffect(() => {
    const current = peekGuestFlight();
    if (!current) return;
    const shell = shellRef.current;
    const clear = window.setTimeout(() => {
      clearGuestFlight();
      delete document.documentElement.dataset.guestArrive;
    }, durPanel + stagger * 11);
    if (!shell || prefersReducedMotion()) return () => window.clearTimeout(clear);
    shell.getAnimations().forEach((item) => item.cancel());
    const box = shell.getBoundingClientRect();
    const origin = `${current.x - box.left}px ${current.y - box.top}px`;
    shell.animate(
      [
        { opacity: 0, transform: "scale(0.96)", transformOrigin: origin },
        { opacity: 1, transform: "none", transformOrigin: origin },
      ],
      { duration: durPanel, easing: easeOut, fill: "both" },
    );
    const mark = Array.from(shell.querySelectorAll<HTMLElement>("[data-wordmark]")).find(
      (item) => item.getClientRects().length > 0,
    );
    if (current.from && mark) {
      const to = mark.getBoundingClientRect();
      if (to.width > 0 && to.height > 0) {
        mark.getAnimations().forEach((item) => item.cancel());
        mark.animate(
          [
            {
              transformOrigin: "top left",
              transform: `translate(${current.from.left - to.left}px, ${current.from.top - to.top}px) scale(${current.from.width / to.width}, ${current.from.height / to.height})`,
            },
            { transformOrigin: "top left", transform: "none" },
          ],
          { duration: durMove, easing: easeInOut },
        );
      }
    }
    return () => window.clearTimeout(clear);
  }, []);

  return (
    <TooltipProvider>
      <ToastProvider>
      <ProgressFlush userId={session.kind === "user" ? session.id : null} />
      <ShelfProvider
        signedIn={session.kind === "user" && session.role !== "admin"}
        userId={session.kind === "user" ? session.id : null}
        favoriteIds={shelves.favoriteIds}
        libraryIds={shelves.libraryIds}
        libraryAddedAt={shelves.libraryAddedAt}
      >
      <div ref={shellRef} className="min-h-screen bg-background">
        <div className="flex min-h-screen">
          <SideRail session={session} />
          <div className="flex min-w-0 flex-1 flex-col pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
            <div className={onBook ? "hidden md:contents" : "contents"}>
              <header className="sticky top-0 z-30 flex items-center gap-3 bg-card px-4 py-3 md:gap-4 md:px-8">
                {admin ? (
                  <Wordmark />
                ) : (
                  <>
                    <Link href="/browse" aria-label="Bibliotech" data-wordmark="mobile" className="inline-flex size-11 shrink-0 items-center justify-center md:hidden">
                      <BookOpen size={20} strokeWidth={1.5} aria-hidden />
                    </Link>
                    <Wordmark href="/browse" mark="desktop" className="hidden md:inline-flex" />
                    <Suspense fallback={<SearchBar />}>
                      <ShellSearch />
                    </Suspense>
                  </>
                )}
                <div className="ml-auto flex items-center gap-2 md:gap-3">
                  <QuotaMeter session={session} />
                  {/* On phones the toggle lives on Profile, so search keeps its width. */}
                  <div className="hidden md:block">
                    <ThemeToggle compact />
                  </div>
                  <AccountMenu session={session} upgrade={!lockedPage} />
                </div>
              </header>
              <OfflineBanner />
            </div>
            {/* Book pages skip the page fade: the cover flies in from the card, and the details stagger. */}
            <div key={path} className={onBook ? undefined : "page-enter"}>
              {children}
            </div>
          </div>
        </div>
        <TabBar session={session} />
        {reader && path !== "/library" ? <AIAssistant /> : null}
        <CollectionPickerHost />
      </div>
      </ShelfProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
