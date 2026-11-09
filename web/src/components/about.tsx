"use client";

import { BookOpen, Library, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { stagger } from "@/lib/motion";

const cards = [
  {
    title: "Read offline",
    line: "Download a book and keep it on this device.",
    icon: BookOpen,
  },
  {
    title: "Library and favorites",
    line: "An account keeps the books you save and the ones you mark.",
    icon: Library,
  },
  {
    title: "Ask while you read",
    line: "An assistant for the book you have open.",
    icon: MessageSquare,
  },
];

/** About, under the hero. Fades and rises once it scrolls into view. */
export function About() {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" ref={ref} aria-labelledby="about-heading" className="mt-8 scroll-mt-24">
      <h2 id="about-heading" className={shown ? "rise-in text-2xl leading-8 font-semibold" : "about-pending text-2xl leading-8 font-semibold"}>
        About
      </h2>
      <p className={shown ? "rise-in mt-4 max-w-2xl text-base leading-6" : "about-pending mt-4 max-w-2xl text-base leading-6"} style={{ animationDelay: `${stagger}ms` }}>
        Bibliotech is a free digital library. Read public-domain books, download them, and keep them. A guest can save 5 books a month. An account starts at 5 and rises to 10 after the email is verified, and adds a library, favorites, and an assistant.
      </p>
      <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <li
              key={card.title}
              className={shown ? "rise-in rounded-xl bg-card p-4" : "about-pending rounded-xl bg-card p-4"}
              style={{ animationDelay: `${(index + 2) * stagger}ms` }}
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden />
              <h3 className="mt-4 text-base leading-6 font-medium">{card.title}</h3>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">{card.line}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
