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

// opsz gives the display cut at hero sizes and a sturdier cut on small covers.
const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  // Links in emails already use APP_URL. Social previews need the same origin to resolve their image.
  metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : undefined,
  title: { default: "Bibliotech", template: "%s · Bibliotech" },
  description: "Bibliotech is a free digital library. Read public-domain books, download them, and keep them.",
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
