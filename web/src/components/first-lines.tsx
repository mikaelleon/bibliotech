"use client";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import type { LineSize } from "@/lib/first-lines";

export type ShelfItem = {
  slug: string;
  /** The name as it sits on the spine and the button. */
  title: string;
  author: string;
  line: string;
  hang: boolean;
  size: LineSize;
  /** Cover palette, so a spine is the same color as the cover. */
  background: string;
  color: string;
  /** 0.8 to 1.2: how wide the spine is next to its neighbours. */
  width: number;
  /** 84 to 100: how tall the spine is, as a percent of the shelf. */
  height: number;
};

function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Delay between words: a short line is set slowly enough to read as words, a long one quickly. */
function stepFor(line: string): number {
  const count = line.split(" ").length;
  return Math.min(110, Math.round(460 / Math.max(1, count - 1)));
}

/** One span per word, so the line can set itself a word at a time. The spaces stay real text. */
function words(line: string) {
  const list = line.split(" ");
  return list.map((word, position) => (
    <Fragment key={position}>
      <span className="fl-w" style={{ "--i": position } as CSSProperties}>
        {word}
      </span>
      {position < list.length - 1 ? " " : null}
    </Fragment>
  ));
}

const AUTO_STEPS = 3;

/** How long a line stays before the shelf moves on by itself: time to read it, then a breath. */
function dwell(line: string): number {
  return Math.max(6000, 3500 + line.length * 55);
}

/**
 * The landing hero. Each book on the shelf introduces itself with its own first sentence.
 * The shelf is a tablist: arrow keys move along it, and the line is its panel.
 * Until the reader touches anything, the shelf moves on by itself, slowly.
 */
export function FirstLines({ items, start, search }: { items: ShelfItem[]; start: number; search: ReactNode }) {
  const [index, setIndex] = useState(start);
  const [leaving, setLeaving] = useState<number[]>([]);
  const [touchedState, setTouchedState] = useState(false);
  const [tick, setTick] = useState(0);
  const [steps, setSteps] = useState(0);
  const [hold, setHold] = useState(false);
  const reduced = useSyncExternalStore(subscribeMotion, reducedMotion, () => false);
  const current = useRef(start);
  const touched = useRef(false);
  const leaveTimers = useRef(new Map<number, number>());
  const shelf = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const settled = useRef(false);
  const panelId = useId();

  const touch = useCallback(() => {
    if (touched.current) return;
    touched.current = true;
    setTouchedState(true);
  }, []);

  // Several lines can be fading at once when the reader clicks quickly, so each has its own timer.
  const select = useCallback((next: number) => {
    const previous = current.current;
    if (next === previous) return;
    current.current = next;
    const timers = leaveTimers.current;
    window.clearTimeout(timers.get(next));
    timers.delete(next);
    window.clearTimeout(timers.get(previous));
    timers.set(
      previous,
      window.setTimeout(() => {
        timers.delete(previous);
        setLeaving((list) => list.filter((item) => item !== previous));
      }, 240),
    );
    setLeaving((list) => [...list.filter((item) => item !== next && item !== previous), previous]);
    setIndex(next);
  }, []);

  useEffect(() => {
    const timers = leaveTimers.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  // Move on by itself until the reader touches the page. A hidden tab waits.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) setTick((value) => value + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // It moves on three times at most, never while the pointer or focus is in the hero, and Pause stops it.
  useEffect(() => {
    if (touchedState || reduced || hold || steps >= AUTO_STEPS || document.hidden) return;
    const timer = window.setTimeout(() => {
      setSteps((value) => value + 1);
      select((index + 1) % items.length);
    }, dwell(items[index].line));
    return () => window.clearTimeout(timer);
  }, [hold, index, items, reduced, select, steps, tick, touchedState]);

  // On a phone the shelf scrolls. Keep the raised book in view, without moving the page.
  useEffect(() => {
    const box = shelf.current;
    const tab = tabs.current[index];
    const animate = settled.current && !reduced;
    settled.current = true;
    if (!box || !tab || box.scrollWidth <= box.clientWidth + 1) return;
    box.scrollTo({ left: tab.offsetLeft - (box.clientWidth - tab.offsetWidth) / 2, behavior: animate ? "smooth" : "auto" });
  }, [index, reduced]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = items.length - 1;
    let next = -1;
    if (event.key === "ArrowRight") next = current.current === last ? 0 : current.current + 1;
    else if (event.key === "ArrowLeft") next = current.current === 0 ? last : current.current - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next < 0) return;
    event.preventDefault();
    select(next);
    tabs.current[next]?.focus({ preventScroll: true });
  }

  const active = items[index];

  return (
    <section
      aria-labelledby="fl-heading"
      className="fl"
      onPointerDownCapture={touch}
      onFocusCapture={touch}
      onKeyDownCapture={touch}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHold(true);
      }}
      onPointerLeave={() => setHold(false)}
    >
      <div>
        <h1 id="fl-heading" className="fl-h1">
          Free public&#8209;domain books
        </h1>
        <p className="fl-sub">Read them here, or download one to keep.</p>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${panelId}-tab-${index}`}
        aria-live={touchedState ? "polite" : "off"}
        className="fl-stage"
      >
        {items.map((item, position) => (
          <p
            key={item.slug}
            lang="en"
            className="fl-line"
            data-size={item.size}
            data-hang={item.hang || undefined}
            data-state={position === index ? "active" : leaving.includes(position) ? "leaving" : "idle"}
            aria-hidden={position === index ? undefined : true}
            style={{ "--step": `${stepFor(item.line)}ms` } as CSSProperties}
          >
            {words(item.line)}
          </p>
        ))}
      </div>

      <div className="fl-row">
        <div className="fl-by">
          <Button asChild>
            <Link href={`/books/${active.slug}`}>
              <span key={active.slug} className="fl-swap">
                Open {active.title}
              </span>
            </Link>
          </Button>
          <span key={active.slug} className="fl-author fl-swap">
            {active.author}
          </span>
          {!touchedState && !reduced && steps < AUTO_STEPS ? (
            <button type="button" className="fl-pause" onClick={touch}>
              Pause
            </button>
          ) : null}
        </div>
        <div className="fl-search">{search}</div>
      </div>

      <div
        ref={shelf}
        role="tablist"
        aria-label="Books on the shelf"
        aria-orientation="horizontal"
        className="fl-shelf"
        onKeyDown={onKeyDown}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") touch();
        }}
      >
        {items.map((item, position) => (
          <button
            key={item.slug}
            ref={(node) => {
              tabs.current[position] = node;
            }}
            type="button"
            role="tab"
            id={`${panelId}-tab-${position}`}
            aria-selected={position === index}
            aria-controls={panelId}
            aria-label={`${item.title}, ${item.author}`}
            tabIndex={position === index ? 0 : -1}
            className="fl-spine"
            style={
              {
                "--k": position,
                "--w": item.width,
                "--h": item.height,
                background: item.background,
                color: item.color,
              } as CSSProperties
            }
            onClick={() => select(position)}
          >
            <span className="fl-spine-t" aria-hidden>
              {item.title}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
