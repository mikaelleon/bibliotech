import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cfiForChapter, chapterFromCfi, readEpub, sentencesOf, type EpubChapter } from "@/lib/epub";
import { flushReading, readingPosition, saveReadingPosition } from "@/lib/download-api";
import { bookFile, localBook } from "@/lib/local-books";
import { useSession } from "@/lib/session";
import { colors, font } from "@/theme/tokens";

const speeds = [0.75, 1, 1.25, 1.5, 2];

export default function ReadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const bookId = typeof id === "string" ? id : "";
  const userId = session.kind === "user" ? session.id : "";
  const saved = userId && bookId ? localBook(userId, bookId) : null;
  const savedPath = saved?.path ?? null;
  const [chapters, setChapters] = useState<EpubChapter[] | null>(null);
  const [index, setIndex] = useState(0);
  const [sentence, setSentence] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [size, setSize] = useState(18);
  const [dark, setDark] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [voice, setVoice] = useState("");
  const [listenNote, setListenNote] = useState<string | null>(null);

  useEffect(() => {
    void Speech.getAvailableVoicesAsync().then((list) => {
      setVoices(list);
      if (list.length === 0) setListenNote("This device has no voice, so Listen is hidden.");
    });
  }, []);

  useEffect(() => {
    if (!savedPath || !userId) return;
    let live = true;
    void (async () => {
      try {
        const bytes = await bookFile(userId, bookId).arrayBuffer();
        const parsed = await readEpub(bytes);
        if (!live) return;
        const cfi = await readingPosition(userId, bookId);
        const cover = parsed.findIndex((item) => item.text.length > 80);
        setIndex(cfi ? chapterFromCfi(cfi, parsed.length) : cover > 0 ? cover : 0);
        setChapters(parsed);
        void flushReading(userId);
      } catch (cause) {
        if (live) setError(cause instanceof Error ? cause.message : "This file could not be opened.");
      }
    })();
    return () => {
      live = false;
      Speech.stop();
    };
  }, [bookId, savedPath, userId]);

  useEffect(() => {
    if (!userId || !chapters) return;
    const progress = chapters.length ? (index + 1) / chapters.length : 0;
    void saveReadingPosition(userId, bookId, cfiForChapter(index), progress);
  }, [bookId, chapters, index, userId]);

  const chapter = chapters?.[index];
  const maxLength = Speech.maxSpeechInputLength > 0 ? Speech.maxSpeechInputLength : 4000;
  const sentences = chapter ? sentencesOf(chapter.text, Math.min(maxLength, 300)) : [];

  function stop() {
    setPlaying(false);
    Speech.stop();
  }

  function speakFrom(start: number) {
    if (!sentences[start]) return;
    setPlaying(true);
    setSentence(start);
    Speech.stop();
    Speech.speak(sentences[start], {
      rate: speed,
      voice: voice || undefined,
      onDone: () => {
        if (start + 1 < sentences.length) speakFrom(start + 1);
        else setPlaying(false);
      },
      onStopped: () => setPlaying(false),
    });
  }

  if (!saved) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>This book is not on this device.</Text>
        <Pressable onPress={() => router.replace(`/book/${bookId}` as Href)}><Text style={styles.link}>Download it</Text></Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, dark && styles.dark]}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()}><Text style={styles.link}>Back</Text></Pressable>
        <Pressable onPress={() => { stop(); setIndex((value) => Math.max(0, value - 1)); }}><Text style={styles.link}>Previous</Text></Pressable>
        <Pressable onPress={() => { stop(); setIndex((value) => Math.min((chapters?.length ?? 1) - 1, value + 1)); }}><Text style={styles.link}>Next</Text></Pressable>
        <Pressable onPress={() => setSize((value) => Math.max(14, value - 2))}><Text style={styles.link}>A-</Text></Pressable>
        <Pressable onPress={() => setSize((value) => Math.min(28, value + 2))}><Text style={styles.link}>A+</Text></Pressable>
        <Pressable onPress={() => setDark((value) => !value)}><Text style={styles.link}>{dark ? "Cream" : "Dark"}</Text></Pressable>
      </View>
      {listenNote ? <Text style={styles.progress}>{listenNote}</Text> : (
        <View style={styles.bar}>
          <Pressable onPress={() => (playing ? stop() : speakFrom(sentence))}><Text style={styles.link}>{playing ? "Pause" : "Listen"}</Text></Pressable>
          <Pressable onPress={() => { stop(); setSentence((value) => Math.max(0, value - 1)); }}><Text style={styles.link}>Previous sentence</Text></Pressable>
          <Pressable onPress={() => { stop(); setSentence((value) => Math.min(Math.max(sentences.length - 1, 0), value + 1)); }}><Text style={styles.link}>Next sentence</Text></Pressable>
          <Pressable onPress={() => setSpeed((value) => speeds[(speeds.indexOf(value) + 1) % speeds.length] ?? 1)}><Text style={styles.link}>{speed}x</Text></Pressable>
          {voices.length > 0 ? (
            <Pressable onPress={() => setVoice((current) => {
              const names = voices.map((item) => item.identifier);
              const at = names.indexOf(current);
              return names[(at + 1) % names.length] ?? "";
            })}>
              <Text style={styles.link}>{voices.find((item) => item.identifier === voice)?.name ?? "Voice"}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      <Text style={styles.progress}>{chapters ? `${cfiForChapter(index)} · ${Math.round(((index + 1) / chapters.length) * 100)}%` : ""}</Text>
      {error ? <Text style={styles.body}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[styles.chapter, { fontSize: size, lineHeight: size * 1.5 }, dark && styles.lightText]}>{chapter?.text ?? "Opening the book…"}</Text>
        {playing && sentences[sentence] ? <Text style={styles.current}>{sentences[sentence]}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f1e7" },
  dark: { backgroundColor: "#1c1915" },
  bar: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  link: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.atext, minHeight: 44, textAlignVertical: "center" },
  progress: { paddingHorizontal: 16, fontFamily: font.sans, fontSize: 12, color: colors.muted },
  page: { padding: 16, paddingBottom: 48 },
  title: { fontFamily: font.title, fontSize: 28, lineHeight: 36, color: colors.ink, padding: 16 },
  chapter: { fontFamily: font.sans, color: colors.ink },
  lightText: { color: "#f3ead7" },
  current: { marginTop: 16, fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.atext },
  body: { padding: 16, fontFamily: font.sans, fontSize: 16, color: colors.ink },
});
