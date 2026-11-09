import { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import { Button } from "@/components/Button";
import { readEpub } from "@/lib/epub";
import { requestDownload } from "@/lib/download-api";
import { bookFile, downloadBookFile, forgetBook, localBook, rememberBook } from "@/lib/local-books";
import { useSession } from "@/lib/session";
import { colors, font } from "@/theme/tokens";

type Props = {
  bookId: string;
  title: string;
  author: string;
  category: string;
  hasFile?: boolean;
  canDownload: boolean;
  verified: boolean;
  limit: number;
  resetsAt: string | null;
};

export function DownloadActions(props: Props) {
  const router = useRouter();
  const { session } = useSession();
  const userId = session.kind === "user" ? session.id : "";
  const [onDevice, setOnDevice] = useState(() => Boolean(localBook(userId, props.bookId)));
  const [working, setWorking] = useState(false);
  const [fraction, setFraction] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [repeatOn, setRepeatOn] = useState<string | null>(null);
  const [quotaOn, setQuotaOn] = useState(false);

  async function start(confirmRepeat: boolean) {
    setWorking(true);
    setError(null);
    setFraction(0.05);
    const { status, body } = await requestDownload(props.bookId, confirmRepeat);
    if (status === 409) {
      setWorking(false);
      setRepeatOn(body.error?.lastDownloadedAt ?? new Date().toISOString());
      return;
    }
    if (status === 403 && body.error?.code === "QUOTA_EXCEEDED") {
      setWorking(false);
      setQuotaOn(true);
      return;
    }
    if (!body.url) {
      setWorking(false);
      setError(body.error?.message ?? "The download didn't start.");
      return;
    }
    try {
      const file = await downloadBookFile(body.url, userId, props.bookId, setFraction);
      const bytes = await file.arrayBuffer();
      await readEpub(bytes.slice(0));
      rememberBook({
        userId,
        bookId: props.bookId,
        path: file.uri,
        size: bytes.byteLength,
        savedAt: new Date().toISOString(),
        title: props.title,
        author: props.author,
        category: props.category,
      });
      setOnDevice(true);
      setWorking(false);
    } catch (cause) {
      const partial = bookFile(userId, props.bookId);
      if (partial.exists) partial.delete();
      setWorking(false);
      setError(cause instanceof Error ? cause.message : "Saving the file failed. Try again. It won't use another download.");
    }
  }

  if (!props.canDownload) return null;
  if (!props.hasFile) return <Text style={styles.note}>This book has no file yet.</Text>;

  return (
    <View style={styles.wrap}>
      {onDevice ? (
        <View style={styles.row}>
          <Button label="Read" onPress={() => router.push(`/read/${props.bookId}` as Href)} />
          <Button label="Remove from device" variant="outline" onPress={() => { forgetBook(userId, props.bookId); setOnDevice(false); }} />
        </View>
      ) : (
        <Button label={working ? "Downloading" : "Download"} disabled={working} onPress={() => void start(false)} />
      )}
      {working ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]} />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Modal visible={repeatOn !== null} transparent animationType="fade" onRequestClose={() => setRepeatOn(null)}>
        <View style={styles.scrim}>
          <View style={styles.card}>
            <Text style={styles.title}>You already downloaded this book</Text>
            <Text style={styles.body}>You saved it earlier. Downloading it again to this device does not use any of your downloads.</Text>
            <Button label="Download again" onPress={() => { setRepeatOn(null); void start(true); }} />
            <Button label="Cancel" variant="outline" onPress={() => setRepeatOn(null)} />
          </View>
        </View>
      </Modal>
      <Modal visible={quotaOn} transparent animationType="fade" onRequestClose={() => setQuotaOn(false)}>
        <View style={styles.scrim}>
          <View style={styles.card}>
            <Text style={styles.title}>No downloads left this month</Text>
            <Text style={styles.body}>
              {props.verified
                ? `You've used all ${props.limit} downloads this month.`
                : "You've used all 5 downloads this month. Verify your email to unlock 5 more."}
            </Text>
            <Button label="Download history" variant="outline" onPress={() => { setQuotaOn(false); router.push("/downloads" as Href); }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 16 },
  row: { gap: 8 },
  note: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 12 },
  track: { height: 4, borderRadius: 999, backgroundColor: colors.line, overflow: "hidden" },
  fill: { height: 4, backgroundColor: colors.accent },
  error: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.ink },
  scrim: { flex: 1, backgroundColor: "rgba(31,35,48,0.4)", justifyContent: "center", padding: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, gap: 12 },
  title: { fontFamily: font.title, fontSize: 22, lineHeight: 28, color: colors.ink },
  body: { fontFamily: font.sans, fontSize: 16, lineHeight: 24, color: colors.ink },
});
