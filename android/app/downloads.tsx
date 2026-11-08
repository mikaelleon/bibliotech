import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { forgetBook, forgetUser, localBooks, type LocalBook } from "@/lib/local-books";
import { useSession } from "@/lib/session";
import { colors, font } from "@/theme/tokens";

export default function DownloadsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session.kind === "user" ? session.id : "";
  const [local, setLocal] = useState<LocalBook[]>(() => localBooks(userId));
  const [confirm, setConfirm] = useState(false);

  function reload() {
    setLocal(localBooks(userId));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable onPress={() => router.back()}><Text style={styles.link}>Back</Text></Pressable>
        <Text style={styles.title}>Downloads</Text>
        <Text style={styles.note}>Books saved on this device. Removing one frees space and does not refund a download.</Text>
        <Button label="Download history" href={"/download-history" as Href} variant="outline" />
        {local.length === 0 ? (
          <View style={styles.block}>
            <Text style={styles.empty}>Nothing on this device yet</Text>
            <Button label="Browse books" href="/browse" variant="outline" />
          </View>
        ) : (
          local.map((item) => (
            <View key={item.bookId} style={styles.row}>
              <Text style={styles.book}>{item.title}</Text>
              <Text style={styles.note}>{item.author} · {(item.size / (1024 * 1024)).toFixed(1)} MB</Text>
              <Button label="Read" onPress={() => router.push(`/read/${item.bookId}` as Href)} />
              <Button label="Remove" variant="outline" onPress={() => { forgetBook(userId, item.bookId); reload(); }} />
            </View>
          ))
        )}
        {local.length > 0 && !confirm ? <Button label="Remove all" variant="outline" onPress={() => setConfirm(true)} /> : null}
        {confirm ? (
          <View style={styles.block}>
            <Button label="Remove all books on this device" onPress={() => { forgetUser(userId); setConfirm(false); reload(); }} />
            <Button label="Cancel" variant="outline" onPress={() => setConfirm(false)} />
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
  empty: { fontFamily: font.title, fontSize: 22, lineHeight: 28, color: colors.ink },
  link: { fontFamily: font.medium, fontSize: 14, color: colors.atext, minHeight: 44 },
  row: { gap: 8, paddingVertical: 8 },
});
