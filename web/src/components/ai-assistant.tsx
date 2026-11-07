"use client";

import { MessagesSquare, Send, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const prompts = [
  "Find a short book about economics",
  "What is in the Science category?",
  "Suggest a classic I can finish in a week",
];

/**
 * Ask AI entry. Desktop opens a right drawer. Under 768px it opens a bottom sheet.
 * Sending stays off until Phase 2.
 */
export function AIAssistant({ hideTriggerOnMobile = false }: { hideTriggerOnMobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobile(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "fixed z-30 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm leading-5 font-medium shadow-[var(--shadow-overlay)]",
            "right-4 bottom-20 md:right-8 md:bottom-8",
            hideTriggerOnMobile && "max-md:hidden",
            open && "hidden",
          )}
        >
          <MessagesSquare size={16} strokeWidth={1.5} aria-hidden />
          Ask AI
        </button>
      </SheetTrigger>
      <SheetContent side={mobile ? "bottom" : "right"} aria-describedby={undefined}>
        {mobile ? (
          <div aria-hidden className="mx-auto mt-2 h-1 w-12 rounded-full bg-border" />
        ) : null}
        <div className="flex items-center justify-between px-4 py-1 md:py-3">
          <SheetTitle className="section-title">
            <span className="inline-flex items-center gap-2">
              <MessagesSquare size={20} strokeWidth={1.5} aria-hidden />
              AI assistant
            </span>
          </SheetTitle>
          <SheetClose asChild>
            <Button type="button" variant="link" className="size-11 px-0 text-foreground no-underline" aria-label="Close AI assistant">
              <X size={20} strokeWidth={1.5} />
            </Button>
          </SheetClose>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 md:py-6">
          <MessagesSquare size={24} strokeWidth={1.5} aria-hidden className="hidden text-muted-foreground md:block" />
          <p className="section-title md:mt-4">AI assistant coming in Phase 2</p>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            It will answer questions about the library and help you pick your next book.
          </p>
          <p className="mt-4 text-sm leading-5 font-medium md:mt-6">Try asking</p>
          <ul className="mt-1 md:mt-2">
            {prompts.map((prompt) => (
              <li key={prompt}>
                <button
                  type="button"
                  className="press min-h-11 w-full py-2 text-left text-sm leading-5"
                  onClick={() => setDraft(prompt)}
                >
                  {prompt}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <form
          className="p-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="ai-message" className="sr-only">
            Message the assistant
          </label>
          <div className="flex gap-2">
            <input
              id="ai-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about a book"
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm"
            />
            <Button type="submit" disabled aria-label="Send message" className="size-11 px-0">
              <Send size={16} strokeWidth={1.5} />
            </Button>
          </div>
          <p className="mt-2 text-xs leading-4 text-muted-foreground">Sending is switched off until Phase 2.</p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
