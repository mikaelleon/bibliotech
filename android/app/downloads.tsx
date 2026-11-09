import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { BookCard } from "@/components/BookCard";
import { CardMarks } from "@/components/CardMarks";
import { downloadHistory } from "@/lib/download-api";
import { getBook } from "@/lib/books";
import { localBooks } from "@/lib/local-books";
import { useSession } from "@/lib/session";
import type { Book } from "@/lib/types";
import { colors, font } from "@/theme/tokens";

type HistoryItem = { id: string; title: string; author: string; firstDownloadedAt: string; times: number };

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function DownloadsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session.kind === "user" ? session.id : "";
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [failed, setFailed] = useState(false);
  const onDevice = new Set(localBooks(userId).map((item) => item.bookId));
  const used = session.kind === "user" ? session.downloadsUsed : 0;
  const limit = session.kind === "user" ? session.downloadLimit : 0;
  const ordered = [...history].sort((a, b) => Date.parse(b.firstDownloadedAt) - Date.parse(a.firstDownloadedAt));

  useEffect(() => {
    void downloadHistory().then(setHistory).catch(() => setFailed(true));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable onPress={() => router.back()}><Text style={styles.link}>Back</Text></Pressable>
        <Text style={styles.title}>Downloads</Text>
        <Text style={styles.note}>Every book this account has downloaded.</Text>
        <Text style={styles.note}>{used} / {limit}</Text>
        {failed ? <Text style={styles.note}>Download history needs a connection. Books on this device are in Library.</Text> : null}
        {!failed && ordered.length === 0 ? (
          <View style={styles.block}>
            <Text style={styles.empty}>Nothing downloaded yet</Text>
            <Button label="Browse books" href="/browse" variant="outline" />
          </View>
        ) : null}
        {ordered.length > 0 ? (
          <View style={styles.grid}>
            {ordered.map((item) => {
              const book: Book = getBook(item.id) ?? {
                id: item.id,
                title: item.title,
                author: item.author,
                category: "Fiction",
                language: "English",
                license: "Public domain",
                sourceName: "",
                sourceUrl: "",
                summary: "",
              };
              const here = onDevice.has(item.id);
              return (
                <View key={item.id} style={styles.cell}>
                  <BookCard book={book} showCategory corner={<CardMarks book={book} downloaded={here} />} />
                  <Text style={styles.when}>{dateLabel(item.firstDownloadedAt)} · {item.times} {item.times === 1 ? "time" : "times"}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 16, gap: 12, paddingBottom: 48 },
  block: { gap: 12 },
  title: { fontFamily: font.title, fontSize: 32, lineHeight: 40, color: colors.ink },
  book: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: colors.ink },
  note: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  when: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 8 },
  empty: { fontFamily: font.title, fontSize: 22, lineHeight: 28, color: colors.ink },
  link: { fontFamily: font.medium, fontSize: 14, color: colors.atext, minHeight: 44 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  cell: { width: "47%" },
});
