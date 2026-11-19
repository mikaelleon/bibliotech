"use client";

import { MessagesSquare, Send, Square, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Session } from "@/lib/types";
import { cn } from "@/lib/utils";

const prompts = [
  "What is in the Science category?",
  "What books do you have by Charles Darwin?",
  "Suggest a Fiction book from the library",
];

const MAX_CHARS = 300;
const HISTORY_TURNS = 6;

type Quota = {
  tier: string;
  usedToday: number;
  limitToday: number;
  usedMonth: number;
  limitMonth: number;
  resetsDailyAt: string;
  resetsMonthlyAt: string;
};

type Message = { id: number; role: "user" | "model"; text: string; error?: boolean; suggestions?: string[] };

type ApiError = { code?: string; message?: string; resetsAt?: string; retryAfter?: number };

function resetText(iso: string | undefined, monthly = false): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return monthly
    ? ` It resets on ${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}.`
    : ` It resets at ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`;
}

/** One friendly sentence per error code from the API (docs/ai-assistant.md section 8). */
function errorText(error: ApiError, status: number): string {
  switch (error.code) {
    case "unauthenticated":
      return "Log in to ask the assistant.";
    case "rejected":
      return error.message || "I can only help with books, authors and this library.";
    case "too_fast":
      return "Slow down a little, then try again.";
    case "busy":
      return "Wait for the current answer to finish.";
    case "daily_limit":
      return `You've used today's questions.${resetText(error.resetsAt)}`;
    case "monthly_limit":
      return `You've used this month's questions.${resetText(error.resetsAt, true)}`;
    case "busy_try_again":
      return `The assistant is busy. Try again in ${error.retryAfter ?? 30} seconds.`;
    case "ip_limit":
      return "Too many questions from this network today. Try again tomorrow.";
    case "assistant_resting":
      return "The assistant is resting. Back tomorrow.";
    case "upstream_error":
      return "The assistant couldn't answer right now. Try again.";
    default:
      return status >= 500 ? "The assistant isn't available right now." : error.message || "Something went wrong.";
  }
}

/** Reads a server-sent-events body and calls back once per complete event. */
async function readEvents(body: ReadableStream<Uint8Array>, onEvent: (event: string, data: unknown) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end: number;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        onEvent(event, JSON.parse(data));
      } catch {
        // A malformed event is skipped; the stream carries on.
      }
    }
  }
}

/**
 * Ask AI. Desktop opens a right drawer. Under 768px it opens a bottom sheet.
 * Needs an account: visitors see a log-in link instead of the input.
 */
export function AIAssistant({ session, hideTriggerOnMobile = false }: { session: Session; hideTriggerOnMobile?: boolean }) {
  const signedIn = session.kind === "user";
  const unverified = session.kind === "user" && !session.verified;

  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobile(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Remaining questions, loaded the first time the panel opens.
  useEffect(() => {
    if (!open || !signedIn || quota) return;
    let cancelled = false;
    fetch("/api/assistant/quota")
      .then((response) => (response.ok ? response.json() : null))
      .then((json: { quota?: Quota } | null) => {
        if (!cancelled && json?.quota) setQuota(json.quota);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, signedIn, quota]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || streaming) return;

      const history = messages
        .filter((m) => !m.error && m.text)
        .slice(-HISTORY_TURNS)
        .map((m) => ({ role: m.role, text: m.text }));
      const userId = nextId.current++;
      const replyId = nextId.current++;
      setMessages((list) => [
        ...list,
        { id: userId, role: "user", text: message },
        { id: replyId, role: "model", text: "" },
      ]);
      setDraft("");
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      const patch = (change: (m: Message) => Message) =>
        setMessages((list) => list.map((m) => (m.id === replyId ? change(m) : m)));
      const fail = (error: ApiError, status: number) =>
        patch((m) => ({ ...m, text: errorText(error, status), error: true }));

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const json = (await response.json().catch(() => null)) as { error?: ApiError } | null;
          fail(json?.error ?? {}, response.status);
        } else {
          await readEvents(response.body, (event, data) => {
            const payload = data as { text?: string; quota?: Quota | null; suggestions?: string[] } & ApiError;
            if (event === "meta" || event === "done") {
              if (payload.quota) setQuota(payload.quota);
            } else if (event === "suggestions" && Array.isArray(payload.suggestions)) {
              const suggestions = payload.suggestions.filter((item): item is string => typeof item === "string").slice(0, 3);
              patch((m) => ({ ...m, suggestions }));
            } else if (event === "delta" && payload.text) {
              patch((m) => ({ ...m, text: m.text + payload.text }));
            } else if (event === "error") {
              patch((m) => ({ ...m, text: m.text ? `${m.text}\n\n${errorText(payload, 500)}` : errorText(payload, 500), error: !m.text }));
            }
          });
          patch((m) => (m.text ? m : { ...m, text: "I couldn't come up with an answer. Try asking another way.", error: true }));
        }
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") fail({ code: "upstream_error" }, 502);
        else patch((m) => (m.text ? m : { ...m, text: "Stopped.", error: true }));
      } finally {
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [messages, streaming],
  );

  const left = quota ? Math.max(0, quota.limitToday - quota.usedToday) : null;

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
        {mobile ? <div aria-hidden className="mx-auto mt-2 h-1 w-12 rounded-full bg-border" /> : null}
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
          {messages.length === 0 ? (
            <>
              <MessagesSquare size={24} strokeWidth={1.5} aria-hidden className="hidden text-muted-foreground md:block" />
              <p className="text-sm leading-5 text-muted-foreground md:mt-4">
                Ask about books, authors and what this library has, or for a pick for your next read.
              </p>
              {signedIn ? (
                <>
                  <p className="mt-4 text-sm leading-5 font-medium md:mt-6">Try asking</p>
                  <ul className="mt-1 md:mt-2">
                    {prompts.map((prompt) => (
                      <li key={prompt}>
                        <button type="button" className="press min-h-11 w-full py-2 text-left text-sm leading-5" onClick={() => setDraft(prompt)}>
                          {prompt}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : (
            <ol aria-live="polite" className="flex flex-col gap-3">
              {messages.map((m, index) => {
                const last = index === messages.length - 1;
                return (
                  <li
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-5 whitespace-pre-wrap",
                      m.role === "user" ? "self-end bg-foreground text-background" : "self-start bg-muted",
                      m.error && "text-muted-foreground italic",
                    )}
                  >
                    {m.text}
                    {streaming && last && m.role === "model" && !m.error ? (
                      <span aria-hidden className="ml-0.5 inline-block animate-pulse motion-reduce:animate-none">
                        ▍
                      </span>
                    ) : null}
                    {last && !streaming && m.suggestions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2 whitespace-normal not-italic">
                        {m.suggestions.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => void send(item)}
                            className="press min-h-9 rounded-full border border-border bg-background px-3 py-1 text-left text-xs leading-4 text-foreground"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
              <div ref={endRef} />
            </ol>
          )}
        </div>

        {signedIn ? (
          <form
            className="p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <label htmlFor="ai-message" className="sr-only">
              Message the assistant
            </label>
            <div className="flex gap-2">
              <input
                id="ai-message"
                value={draft}
                maxLength={MAX_CHARS}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about a book"
                disabled={streaming}
                autoComplete="off"
                className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm disabled:opacity-60"
              />
              {streaming ? (
                <Button type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop answer" className="size-11 px-0">
                  <Square size={16} strokeWidth={1.5} />
                </Button>
              ) : (
                <Button type="submit" disabled={!draft.trim()} aria-label="Send message" className="size-11 px-0">
                  <Send size={16} strokeWidth={1.5} />
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs leading-4 text-muted-foreground">
              {left !== null && quota ? `${left} of ${quota.limitToday} questions left today. ` : ""}
              Don&rsquo;t share personal info. Answers may be inaccurate.
            </p>
            {unverified ? <p className="mt-1 text-xs leading-4 text-muted-foreground">Verify your email for 20 questions a day.</p> : null}
          </form>
        ) : (
          <div className="p-4">
            <p className="text-sm leading-5">
              <Link href="/login" className="text-brand-text underline">
                Log in
              </Link>{" "}
              to ask the assistant.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
