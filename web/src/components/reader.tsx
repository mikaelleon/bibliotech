"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { chapterFromCfi, cfiForChapter, readEpub, sentencesOf, type EpubChapter } from "@/lib/epub";
import { useShelf } from "@/components/shelf-provider";
import { flushProgress, queueProgress, savedBook } from "@/lib/offline-books";

const speeds = [0.75, 1, 1.25, 1.5, 2];

export function Reader({ bookId, title }: { bookId: string; title: string }) {
  const { userId } = useShelf();
  const [chapters, setChapters] = useState<EpubChapter[] | null>(null);
  const [index, setIndex] = useState(0);
  const [missing, setMissing] = useState(false);
  const [size, setSize] = useState(18);
  const [dark, setDark] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [sentence, setSentence] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState("");
  const [listenNote, setListenNote] = useState<string | null>(null);
  const playingRef = useRef(false);

  const chapter = chapters?.[index];
  const sentences = useMemo(() => (chapter ? sentencesOf(chapter.text, 180) : []), [chapter]);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    void savedBook(userId, bookId).then(async (row) => {
      if (!live) return;
      if (!row) {
        setMissing(true);
        return;
      }
      try {
        const parsed = await readEpub(await row.fileBlob.arrayBuffer());
        if (!live) return;
        setChapters(parsed);
        const cover = parsed.findIndex((item) => item.text.length > 80);
        if (cover > 0) setIndex(cover);
        const saved = await fetch(`/api/books/${bookId}/progress`).then((response) => (response.ok ? response.json() : null));
        if (live && saved?.cfi) setIndex(chapterFromCfi(saved.cfi, parsed.length));
      } catch {
        if (live) setMissing(true);
      }
    });
    const loadVoices = () => {
      const list = window.speechSynthesis?.getVoices() ?? [];
      setVoices(list);
      if (list.length === 0) setListenNote("This browser has no voices, so Listen is hidden.");
    };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => {
      live = false;
      playingRef.current = false;
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
    };
  }, [bookId, userId]);

  useEffect(() => {
    if (!userId || !chapters) return;
    const cfi = cfiForChapter(index);
    const updatedAt = new Date().toISOString();
    const progress = chapters.length ? (index + 1) / chapters.length : 0;
    void queueProgress({ userId, bookId, cfi, progress, updatedAt }).then(() => flushProgress(userId));
  }, [bookId, chapters, index, userId]);

  function stop() {
    playingRef.current = false;
    setPlaying(false);
    window.speechSynthesis?.cancel();
  }

  function speakFrom(start: number) {
    if (!window.speechSynthesis || sentences.length === 0) return;
    playingRef.current = true;
    setPlaying(true);
    setSentence(start);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sentences[start] ?? "");
    utterance.rate = speed;
    const picked = voices.find((item) => item.name === voice);
    if (picked) utterance.voice = picked;
    utterance.onend = () => {
      if (!playingRef.current) return;
      if (start + 1 < sentences.length) speakFrom(start + 1);
      else stop();
    };
    window.speechSynthesis.speak(utterance);
  }

  if (!userId || missing) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-4 py-8">
        <h1 className="page-title">{title}</h1>
        <p className="mt-2 text-muted-foreground">This book is not on this device.</p>
        <Link href={`/books/${bookId}`} className="mt-4 inline-flex text-brand-text underline">Download it</Link>
      </main>
    );
  }
  if (!chapter) return <main className="px-4 py-8 text-muted-foreground">Opening the book…</main>;

  return (
    <main className={dark ? "min-h-full bg-[#1c1915] text-[#f3ead7]" : "min-h-full bg-[#f6f1e7] text-[#1f2330]"} onClick={() => setChrome((value) => !value)}>
      {chrome ? (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-inherit px-4 py-3" onClick={(event) => event.stopPropagation()}>
          <Link href={`/books/${bookId}`} className="text-sm underline">Back</Link>
          <select aria-label="Chapter" value={index} onChange={(event) => { stop(); setIndex(Number(event.target.value)); }} className="min-h-11 max-w-xs rounded-lg border border-border bg-card px-2 text-sm">
            {chapters?.map((item, itemIndex) => (
              <option key={item.id} value={itemIndex}>{item.title}</option>
            ))}
          </select>
          <button type="button" className="min-h-11 px-2" onClick={() => setSize((value) => Math.max(14, value - 2))}>A−</button>
          <button type="button" className="min-h-11 px-2" onClick={() => setSize((value) => Math.min(28, value + 2))}>A+</button>
          <button type="button" className="min-h-11 px-2" onClick={() => setDark((value) => !value)}>{dark ? "Cream" : "Dark"}</button>
          <span className="text-sm text-muted-foreground">{chapters ? Math.round(((index + 1) / chapters.length) * 100) : 0}%</span>
        </div>
      ) : null}
      <article className="mx-auto max-w-[680px] px-4 py-8" style={{ fontSize: size, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: chapter.html }} />
      {chrome && !listenNote ? (
        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border bg-inherit px-4 py-3" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="min-h-11 rounded-full bg-primary px-4 text-sm text-primary-foreground" onClick={() => (playing ? stop() : speakFrom(sentence))}>{playing ? "Pause" : "Listen"}</button>
          <button type="button" className="min-h-11 px-2" onClick={() => { stop(); setSentence((value) => Math.max(0, value - 1)); }}>Previous sentence</button>
          <button type="button" className="min-h-11 px-2" onClick={() => { stop(); setSentence((value) => Math.min(sentences.length - 1, value + 1)); }}>Next sentence</button>
          <label className="text-sm">
            Speed
            <select aria-label="Speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="ml-2 min-h-11 rounded-lg border border-border bg-card px-2">
              {speeds.map((item) => <option key={item} value={item}>{item}x</option>)}
            </select>
          </label>
          {voices.length > 0 ? (
            <select aria-label="Voice" value={voice} onChange={(event) => setVoice(event.target.value)} className="min-h-11 max-w-xs rounded-lg border border-border bg-card px-2 text-sm">
              <option value="">Default voice</option>
              {voices.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          ) : null}
          {playing && sentences[sentence] ? <p className="w-full text-sm leading-5">{sentences[sentence]}</p> : null}
        </div>
      ) : null}
      {listenNote ? <p className="px-4 pb-6 text-sm text-muted-foreground">{listenNote}</p> : null}
      {chrome ? (
        <div className="flex justify-between px-4 pb-8" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="min-h-11" disabled={index === 0} onClick={() => { stop(); setIndex((value) => value - 1); }}>Previous</button>
          <button type="button" className="min-h-11" disabled={!chapters || index >= chapters.length - 1} onClick={() => { stop(); setIndex((value) => value + 1); }}>Next</button>
        </div>
      ) : null}
    </main>
  );
}
