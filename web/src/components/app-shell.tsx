"use client";

import { BookOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { AccountMenu } from "@/components/account-menu";
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
  const onBook = path.startsWith("/books/");
  const admin = session.kind === "user" && session.role === "admin";
  const reader = session.kind === "guest" || (session.kind === "user" && !admin);
  const lockedPage = path === "/library" || path === "/favorites" || path === "/profile";

  return (
    <TooltipProvider>
      <ToastProvider>
      <ShelfProvider
        signedIn={session.kind === "user" && session.role !== "admin"}
        favoriteIds={shelves.favoriteIds}
        libraryIds={shelves.libraryIds}
        libraryAddedAt={shelves.libraryAddedAt}
      >
      <div className="min-h-screen bg-background">
        <div className="flex min-h-screen">
          <SideRail session={session} />
          <div className="flex min-w-0 flex-1 flex-col pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
            <div className={onBook ? "hidden md:contents" : "contents"}>
              <header className="sticky top-0 z-30 flex items-center gap-3 bg-card px-4 py-3 md:gap-4 md:px-8">
                {admin ? (
                  <Wordmark />
                ) : (
                  <>
                    <Link href="/browse" aria-label="E-Library AI" className="inline-flex size-11 shrink-0 items-center justify-center md:hidden">
                      <BookOpen size={20} strokeWidth={1.5} aria-hidden />
                    </Link>
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
        {reader ? <AIAssistant /> : null}
      </div>
      </ShelfProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
