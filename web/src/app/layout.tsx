import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Newsreader } from "next/font/google";

import { SearchHotkey } from "@/components/search-hotkey";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: { default: "E-Library AI", template: "%s · E-Library AI" },
  description: "Search free, legally downloadable books.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        <SearchHotkey />
        {children}
      </body>
    </html>
  );
}
