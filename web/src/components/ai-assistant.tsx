"use client";

import { Check, History, MessagesSquare, Send, Square, SquarePen, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { AssistantHistory } from "@/components/assistant-history";
import { AssistantText } from "@/components/assistant-text";
import { useShelf } from "@/components/shelf-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { createGroupAction, saveCollectionPickerAction } from "@/lib/actions";
import type { ActionProposal } from "@/lib/assistant/actions";
import type { ChatSummary, StoredMessage } from "@/lib/assistant/chat";
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

type Message = { id: number; role: "user" | "model"; text: string; error?: boolean; suggestions?: string[]; actions?: ActionProposal[]; fresh?: boolean };

type ActionState = "running" | "done" | "failed" | "dismissed";

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
    case "chat_full":
      return "This chat is full. Start a new chat.";
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
  // Saved chats are for registered (email-verified) accounts. Unverified accounts chat without saving.
  const canSave = session.kind === "user" && session.verified;

  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [actionState, setActionState] = useState<Record<string, ActionState>>({});
  const [view, setView] = useState<"chat" | "history">("chat");
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [chatsError, setChatsError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const chatRef = useRef<string | null>(null);
  // Which send owns the screen. Switching chats clears it, so a late answer can't touch the new chat.
  const activeRef = useRef(0);
  const shelf = useShelf();
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stick = useRef(true);

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

  // Follow the answer only while the reader is at the bottom. Scrolling up to reread stops the pull.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function setChat(id: string | null) {
    chatRef.current = id;
    setChatId(id);
  }

  /** Stops whatever is streaming and detaches it from the screen. */
  function detach() {
    activeRef.current = 0;
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }

  function startNewChat() {
    detach();
    setMessages([]);
    setDraft("");
    setChat(null);
    setView("chat");
  }

  async function openHistory() {
    if (view === "history") {
      setView("chat");
      return;
    }
    setView("history");
    setChatsError(null);
    try {
      const response = await fetch("/api/assistant/chats");
      if (!response.ok) throw new Error("load");
      const json = (await response.json()) as { chats?: ChatSummary[] };
      setChats(json.chats ?? []);
    } catch {
      setChats([]);
      setChatsError("We could not load your chats. Try again.");
    }
  }

  async function openChat(id: string) {
    detach();
    try {
      const response = await fetch(`/api/assistant/chats/${id}`);
      if (!response.ok) throw new Error("load");
      const json = (await response.json()) as { messages?: StoredMessage[] };
      setMessages((json.messages ?? []).map((m) => ({ id: nextId.current++, role: m.role, text: m.text })));
      setChat(id);
      setDraft("");
      stick.current = true;
      setView("chat");
    } catch {
      setChatsError("We could not open that chat. Try again.");
    }
  }

  async function deleteChats(id: string | "all") {
    const before = chats;
    setChatsError(null);
    setChats((list) => (list ? (id === "all" ? [] : list.filter((c) => c.id !== id)) : list));
    if (id === "all" || id === chatRef.current) {
      detach();
      setMessages([]);
      setChat(null);
    }
    try {
      const response = await fetch(id === "all" ? "/api/assistant/chats" : `/api/assistant/chats/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete");
    } catch {
      setChats(before);
      setChatsError("We could not delete that. Try again.");
    }
  }

  /**
   * Runs a change the reader confirmed. It goes through the same authorized server actions as the
   * heart and Library buttons, so the session check and row level security apply. The model never
   * calls anything: it only proposed this card.
   */
  async function runAction(action: ActionProposal) {
    setActionState((state) => ({ ...state, [action.id]: "running" }));
    let ok = false;
    try {
      const slug = action.slug ?? "";
      if (action.type === "add_library") ok = await shelf.set("library", slug, true);
      else if (action.type === "remove_library") ok = await shelf.set("library", slug, false);
      else if (action.type === "favorite") ok = await shelf.set("favorites", slug, true);
      else if (action.type === "unfavorite") ok = await shelf.set("favorites", slug, false);
      else if (action.type === "add_to_collection") {
        const result = await saveCollectionPickerAction(
          [slug],
          action.collectionId ? [action.collectionId] : [],
          action.collectionId ? "" : (action.collectionName ?? ""),
          false,
        );
        ok = result.ok;
      } else if (action.type === "create_collection") {
        ok = (await createGroupAction(action.collectionName ?? "")).ok;
      }
    } catch {
      ok = false;
    }
    if (ok) router.refresh();
    setActionState((state) => ({ ...state, [action.id]: ok ? "done" : "failed" }));
  }

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || streaming) return;

      const history = messages
        .filter((m, i) => !m.error && m.text && !messages[i + 1]?.error)
        .slice(-HISTORY_TURNS)
        .map((m) => ({ role: m.role, text: m.text }));
      const userId = nextId.current++;
      const replyId = nextId.current++;
      // A new chat gets its id here, so a stopped first question still lands in the right chat.
      let sendChatId: string | null = null;
      if (canSave) {
        sendChatId = chatRef.current ?? crypto.randomUUID();
        setChat(sendChatId);
      }
      activeRef.current = replyId;
      const alive = () => activeRef.current === replyId;
      setMessages((list) => [
        ...list,
        { id: userId, role: "user", text: message, fresh: true },
        { id: replyId, role: "model", text: "", fresh: true },
      ]);
      setDraft("");
      stick.current = true;
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      const patch = (change: (m: Message) => Message) =>
        setMessages((list) => list.map((m) => (m.id === replyId ? change(m) : m)));
      // A failed or stopped question goes back into the box, so nothing the reader typed is lost.
      const restore = () => {
        if (alive()) setDraft((current) => current || message);
      };
      const fail = (error: ApiError, status: number) => {
        patch((m) => ({ ...m, text: errorText(error, status), error: true }));
        if (status !== 401) restore();
      };

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history, ...(sendChatId ? { chatId: sendChatId } : {}) }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const json = (await response.json().catch(() => null)) as { error?: ApiError } | null;
          fail(json?.error ?? {}, response.status);
        } else {
          await readEvents(response.body, (event, data) => {
            const payload = data as { text?: string; quota?: Quota | null; suggestions?: string[]; actions?: ActionProposal[]; id?: string; title?: string } & ApiError;
            if (event === "meta" || event === "done") {
              if (payload.quota) setQuota(payload.quota);
            } else if (event === "chat" && typeof payload.id === "string" && typeof payload.title === "string") {
              const saved: ChatSummary = { id: payload.id, title: payload.title, updatedAt: new Date().toISOString() };
              setChats((list) => (list ? [saved, ...list.filter((c) => c.id !== saved.id)] : list));
            } else if (event === "actions" && Array.isArray(payload.actions)) {
              patch((m) => ({ ...m, actions: payload.actions }));
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
          restore();
        }
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") fail({ code: "upstream_error" }, 502);
        else {
          patch((m) => (m.text ? m : { ...m, text: "Stopped.", error: true }));
          restore();
        }
      } finally {
        if (alive()) {
          abortRef.current = null;
          setStreaming(false);
        }
      }
    },
    [messages, streaming, canSave],
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
          <div className="flex items-center">
            {canSave ? (
              <>
                <Button
                  type="button"
                  variant="link"
                  onClick={startNewChat}
                  className="size-11 px-0 text-foreground no-underline"
                  aria-label="New chat"
                >
                  <SquarePen size={18} strokeWidth={1.5} />
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => void openHistory()}
                  aria-pressed={view === "history"}
                  className={cn("size-11 px-0 text-foreground no-underline", view === "history" && "text-brand-text")}
                  aria-label="Chat history"
                >
                  <History size={18} strokeWidth={1.5} />
                </Button>
              </>
            ) : null}
            <SheetClose asChild>
              <Button type="button" variant="link" className="size-11 px-0 text-foreground no-underline" aria-label="Close AI assistant">
                <X size={20} strokeWidth={1.5} />
              </Button>
            </SheetClose>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 md:py-6"
          onScroll={(event) => {
            const el = event.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
        >
          {view === "history" ? (
            <AssistantHistory
              chats={chats}
              error={chatsError}
              activeId={chatId}
              onOpen={(id) => void openChat(id)}
              onDelete={(id) => void deleteChats(id)}
              onDeleteAll={() => void deleteChats("all")}
            />
          ) : messages.length === 0 ? (
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
            <ol className="flex flex-col gap-3">
              {messages.map((m, index) => {
                const last = index === messages.length - 1;
                return (
                  <li
                    key={m.id}
                    onAnimationEnd={(event) => {
                      if (event.target !== event.currentTarget || !m.fresh) return;
                      setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, fresh: false } : x)));
                    }}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-5",
                      m.fresh && "ai-rise",
                      m.role === "user" ? "self-end bg-foreground text-background" : "self-start border border-border bg-muted",
                      m.error && "text-muted-foreground italic",
                    )}
                  >
                    {m.role === "user" ? (
                      <span className="whitespace-pre-wrap">{m.text}</span>
                    ) : (
                      <AssistantText
                        text={m.text}
                        caret={
                          streaming && last && !m.error ? (
                            <span aria-hidden className="ml-0.5 inline-block animate-pulse motion-reduce:animate-none">
                              ▍
                            </span>
                          ) : null
                        }
                      />
                    )}
                    {m.actions?.some((a) => actionState[a.id] !== "dismissed") && !(last && streaming) ? (
                      <div className="mt-3 flex flex-col gap-2 whitespace-normal not-italic">
                        {m.actions.map((action, i) => {
                          const state = actionState[action.id];
                          if (state === "dismissed") return null;
                          return (
                            <div
                              key={action.id}
                              style={{ "--i": i } as CSSProperties}
                              className="ai-pill rounded-xl border border-border bg-background p-3 text-xs leading-4 text-foreground"
                            >
                              <p>{action.label}</p>
                              {state === "done" ? (
                                <p className="mt-2 inline-flex items-center gap-1 text-muted-foreground">
                                  <Check size={14} strokeWidth={1.5} aria-hidden />
                                  Done
                                </p>
                              ) : (
                                <>
                                  {state === "failed" ? <p className="mt-1 text-muted-foreground">That didn&rsquo;t work. Try again.</p> : null}
                                  <div className="mt-2 flex gap-2">
                                    <Button
                                      type="button"
                                      disabled={state === "running"}
                                      onClick={() => void runAction(action)}
                                      className="relative min-h-9 px-4 text-xs after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
                                    >
                                      {state === "running" ? "Working…" : state === "failed" ? "Try again" : "Confirm"}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={state === "running"}
                                      onClick={() => setActionState((current) => ({ ...current, [action.id]: "dismissed" }))}
                                      className="relative min-h-9 px-4 text-xs after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
                                    >
                                      Not now
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    {last && !streaming && m.suggestions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2 whitespace-normal not-italic">
                        {m.suggestions.map((item, i) => (
                          <button
                            key={item}
                            type="button"
                            disabled={streaming}
                            onClick={() => void send(item)}
                            style={{ "--i": i } as CSSProperties}
                            className="press ai-pill relative min-h-9 rounded-full border border-border bg-background px-3 py-1 text-left text-xs leading-4 text-foreground after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <p role="status" className="sr-only">
          {streaming ? "The assistant is answering." : messages.at(-1)?.role === "model" && messages.at(-1)?.text ? "Answer ready." : ""}
        </p>

        {signedIn && view === "chat" ? (
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
                aria-busy={streaming}
                autoComplete="off"
                className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm"
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
            {unverified ? <p className="mt-1 text-xs leading-4 text-muted-foreground">Verify your email to save your chats and get 20 questions a day.</p> : null}
          </form>
        ) : !signedIn ? (
          <div className="p-4">
            <p className="text-sm leading-5">
              <Link href="/login" className="text-brand-text underline">
                Log in
              </Link>{" "}
              to ask the assistant.
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
