import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Inter, Newsreader } from "next/font/google";
import Script from "next/script";

import { PwaRegister } from "@/components/pwa-register";
import { NavProgress } from "@/components/nav-progress";
import { SearchHotkey } from "@/components/search-hotkey";
import { ViewTransitions } from "@/components/view-transitions";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: { default: "E-Library AI", template: "%s · E-Library AI" },
  description: "Search free, legally downloadable books.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The theme script sets data-theme before React loads, so the server markup can't match it.
    <html lang="en" className={`${inter.variable} ${newsreader.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground antialiased">
        <Script id="theme" strategy="beforeInteractive">
          {`try{if(localStorage.getItem("elib-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`}
        </Script>
        <SearchHotkey />
        <PwaRegister />
        <Suspense>
          <ViewTransitions />
          <NavProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
