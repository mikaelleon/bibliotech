import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { downloadHistory } from "@/lib/download-api";
import { localBooks } from "@/lib/local-books";
import { useSession } from "@/lib/session";
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
        {ordered.map((item, index) => (
          <View key={item.id} style={styles.event}>
            <View style={styles.rail}>
              <View style={styles.dot} />
              {index < ordered.length - 1 ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.body}>
              <Text style={styles.when}>{dateLabel(item.firstDownloadedAt)}</Text>
              <Text style={styles.book}>{item.title}</Text>
              <Text style={styles.note}>
                {item.author} · {item.times} {item.times === 1 ? "time" : "times"}
              </Text>
              <Text style={styles.note}>{onDevice.has(item.id) ? "On this device" : "Downloaded before, not on this device"}</Text>
              {onDevice.has(item.id)
                ? <Button label="Read" onPress={() => router.push(`/read/${item.id}` as Href)} />
                : <Button label="Download again" href={`/book/${item.id}` as Href} variant="outline" />}
            </View>
          </View>
        ))}
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
  when: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: colors.muted },
  empty: { fontFamily: font.title, fontSize: 22, lineHeight: 28, color: colors.ink },
  link: { fontFamily: font.medium, fontSize: 14, color: colors.atext, minHeight: 44 },
  event: { flexDirection: "row", gap: 12 },
  rail: { width: 12, alignItems: "center" },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent, marginTop: 2 },
  line: { width: 2, flex: 1, backgroundColor: colors.line, marginTop: 4 },
  body: { flex: 1, gap: 8, paddingBottom: 16 },
});
