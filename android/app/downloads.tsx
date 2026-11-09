import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { downloadHistory, requestDownload, type HistoryItem } from "@/lib/download-api";
import { readEpub } from "@/lib/epub";
import { downloadBookFile, localBooks, rememberBook } from "@/lib/local-books";
import { useSession } from "@/lib/session";
import { colors, font } from "@/theme/tokens";

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function deviceLine(devices: string[]): string {
  if (devices.length === 0) return "Device not recorded";
  if (devices.length === 1) return `On ${devices[0]}`;
  return `On ${devices.slice(0, -1).join(", ")} and ${devices[devices.length - 1]}`;
}

export default function DownloadsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session.kind === "user" ? session.id : "";
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [failed, setFailed] = useState(false);
  const [onDevice, setOnDevice] = useState<Set<string>>(() => new Set(localBooks(userId).map((item) => item.bookId)));
  const [saving, setSaving] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const used = session.kind === "user" ? session.downloadsUsed : 0;
  const limit = session.kind === "user" ? session.downloadLimit : 0;
  const ordered = [...history].sort((a, b) => Date.parse(b.lastDownloadedAt || b.firstDownloadedAt) - Date.parse(a.lastDownloadedAt || a.firstDownloadedAt));

  useEffect(() => {
    let live = true;
    void downloadHistory()
      .then((rows) => {
        if (!live) return;
        setHistory(rows);
        setOnDevice(new Set(localBooks(userId).map((item) => item.bookId)));
        setFailed(false);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [userId]);

  async function saveOnDevice(item: HistoryItem) {
    setSaving(item.id);
    setRowError(null);
    const { status, body } = await requestDownload(item.id, true);
    if (status !== 200 || !body.url) {
      setSaving(null);
      setRowError({ id: item.id, message: body.error?.message ?? "The download didn't start." });
      return;
    }
    try {
      const file = await downloadBookFile(body.url, userId, item.id, () => undefined);
      const bytes = await file.arrayBuffer();
      await readEpub(bytes.slice(0));
      rememberBook({
        userId,
        bookId: item.id,
        path: file.uri,
        size: bytes.byteLength,
        savedAt: new Date().toISOString(),
        title: item.title,
        author: item.author,
        category: item.category,
      });
      setOnDevice(new Set(localBooks(userId).map((row) => row.bookId)));
      const rows = await downloadHistory();
      setHistory(rows);
    } catch (cause) {
      setRowError({ id: item.id, message: cause instanceof Error ? cause.message : "Saving the file failed. Try again." });
    }
    setSaving(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable onPress={() => router.back()}><Text style={styles.link}>Back</Text></Pressable>
        <Text style={styles.title}>Download history</Text>
        <Text style={styles.note}>Newest first. Saving a book again does not use another download.</Text>
        <Text style={styles.note}>{used} / {limit}</Text>
        {failed ? <Text style={styles.note}>Download history needs a connection. Books on this device are in Library.</Text> : null}
        {!failed && ordered.length === 0 ? (
          <View style={styles.block}>
            <Text style={styles.empty}>Nothing downloaded yet</Text>
            <Button label="Browse books" href="/browse" variant="outline" />
          </View>
        ) : null}
        {ordered.map((item, index) => {
          const when = item.lastDownloadedAt || item.firstDownloadedAt;
          const again = item.times > 1 && item.firstDownloadedAt !== item.lastDownloadedAt;
          const here = onDevice.has(item.id);
          return (
            <View key={item.id} style={styles.event}>
              <View style={styles.rail}>
                <View style={styles.dot} />
                {index < ordered.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={styles.body}>
                <Text style={styles.when}>Last downloaded {dateLabel(when)}</Text>
                <Pressable onPress={() => router.push(`/book/${item.id}` as never)}>
                  <Text style={styles.book}>{item.title}</Text>
                </Pressable>
                <Text style={styles.note}>{item.author}</Text>
                <Text style={styles.note}>{deviceLine(item.devices)}{item.times > 1 ? ` · ${item.times} times` : ""}</Text>
                {again ? <Text style={styles.note}>First downloaded {dateLabel(item.firstDownloadedAt)}.</Text> : null}
                {here ? <Text style={styles.note}>On this device</Text> : (
                  <Button label={saving === item.id ? "Downloading" : "Download"} disabled={saving !== null} variant="outline" onPress={() => void saveOnDevice(item)} />
                )}
                {rowError?.id === item.id ? <Text style={styles.note}>{rowError.message}</Text> : null}
              </View>
            </View>
          );
        })}
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
  body: { flex: 1, gap: 4, paddingBottom: 16 },
});
