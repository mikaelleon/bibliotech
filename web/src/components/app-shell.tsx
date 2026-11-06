"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { AccountMenu } from "@/components/account-menu";
import { AIAssistant } from "@/components/ai-assistant";
import { OfflineBanner } from "@/components/offline-banner";
import { QuotaStrip } from "@/components/quota-strip";
import { SearchBar } from "@/components/search-bar";
import { ShellSearch } from "@/components/shell-search";
import { SideRail } from "@/components/side-rail";
import { TabBar } from "@/components/tab-bar";
import { ToastProvider } from "@/components/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Session } from "@/lib/types";

export function AppShell({ session, children }: { session: Session; children: ReactNode }) {
  const path = usePathname();
  const onBook = path.startsWith("/books/");
  const onAdmin = path.startsWith("/admin");
  const onBrowse = path === "/browse";

  return (
    <TooltipProvider>
      <ToastProvider>
      <div className="min-h-screen bg-background">
        <div className="flex min-h-screen">
          <SideRail session={session} />
          <div className="flex min-w-0 flex-1 flex-col pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
            <div className={onBook ? "hidden md:contents" : "contents"}>
              <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:gap-4 md:px-8">
                <Suspense fallback={<SearchBar />}>
                  <ShellSearch />
                </Suspense>
                <div className="ml-auto">
                  <AccountMenu session={session} />
                </div>
              </header>
              {onAdmin ? null : <QuotaStrip session={session} />}
              <OfflineBanner />
            </div>
            {children}
          </div>
        </div>
        <TabBar session={session} />
        {onBrowse ? <AIAssistant hideTriggerOnMobile={session.kind !== "user"} /> : null}
      </div>
      </ToastProvider>
    </TooltipProvider>
  );
}
