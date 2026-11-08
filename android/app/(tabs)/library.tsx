import { useNetworkState } from "expo-network";
import { useRouter, type Href } from "expo-router";
import { Library } from "lucide-react-native";
import { useCallback, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BookCard } from "@/components/BookCard";
import { LibraryButton } from "@/components/LibraryButton";
import { Toast, type ToastItem } from "@/components/Toast";
import { FadeIn, useFreshList } from "@/components/FadeIn";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { LockedPanel } from "@/components/LockedPanel";
import { PageHeader } from "@/components/PageHeader";
import { getBook } from "@/lib/books";
import { useCatalogBooks } from "@/lib/catalog";
import { forgetBook, forgetUser, localBooks, type LocalBook } from "@/lib/local-books";
import { useSession } from "@/lib/session";
import { colors, font, radius } from "@/theme/tokens";

type ViewName = "library" | "downloaded";

export default function LibraryScreen() {
  const router = useRouter();
  const { session, libraryIds, setInLibrary } = useSession();
  const fresh = useFreshList();
  const [notice, setNotice] = useState<ToastItem | null>(null);
  const [nextId, setNextId] = useState(1);
  const [view, setView] = useState<ViewName>("library");
  const [confirm, setConfirm] = useState(false);
  const userId = session.kind === "user" ? session.id : "";
  const [local, setLocal] = useState<LocalBook[]>(() => localBooks(userId));
  const dismiss = useCallback(() => setNotice(null), []);
  useCatalogBooks();
  const network = useNetworkState();
  if (session.kind !== "user") return <LockedPanel title="Library" />;

  const offline = network.isInternetReachable === false;
  const onDevice = new Set(local.map((item) => item.bookId));
  const books = libraryIds
    .map((id) => getBook(id))
    .filter((book) => book !== undefined)
    .filter((book) => !offline || onDevice.has(book.id));
  const count = books.length === 1 ? "1 book in your Library" : `${books.length} books in your Library`;

  function reload() {
    setLocal(localBooks(userId));
  }

  function remove(bookId: string) {
    const at = libraryIds.indexOf(bookId);
    setInLibrary(bookId, false);
    setNotice({
      id: nextId,
      message: "Removed from Library",
      actionLabel: "Undo",
      onAction: () => setInLibrary(bookId, true, at),
    });
    setNextId((id) => id + 1);
  }

  const header = (
    <View style={styles.header}>
      <PageHeader title="Library" lede={view === "library" ? count : "Books saved on this device."} />
      <ViewToggle value={view} onChange={setView} />
    </View>
  );

  return (
    <View style={styles.wrap}>
      {view === "library" ? (
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.page}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState
              icon={<Library color={colors.muted} size={24} strokeWidth={1.5} />}
              title="Your Library is empty"
              action={<Button label="Browse books" href="/browse" variant="outline" />}
            >
              Open a book and choose Add to Library. It doesn’t use a download.
            </EmptyState>
          }
          columnWrapperStyle={books.length > 0 ? styles.row : undefined}
          renderItem={({ item, index }) => (
            <FadeIn index={index} skip={!fresh} style={styles.cell}>
              <BookCard book={item} corner={<LibraryButton title={item.title} active onPress={() => remove(item.id)} />} />
              {onDevice.has(item.id) ? <Text style={styles.device}>On this device</Text> : null}
            </FadeIn>
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.page}>
          {header}
          <Text style={styles.note}>Removing a book frees space and does not refund a download.</Text>
          {local.length === 0 ? (
            <EmptyState
              icon={<Library color={colors.muted} size={24} strokeWidth={1.5} />}
              title="Nothing on this device yet"
              action={<Button label="Browse books" href="/browse" variant="outline" />}
            >
              A download saves the book here. It stays in download history if this device clears it.
            </EmptyState>
          ) : (
            local.map((item) => (
              <View key={item.bookId} style={styles.deviceRow}>
                <Text style={styles.book}>{item.title}</Text>
                <Text style={styles.note}>{item.author} · {(item.size / (1024 * 1024)).toFixed(1)} MB</Text>
                <Button label="Read" onPress={() => router.push(`/read/${item.bookId}` as Href)} />
                <Button label="Remove" variant="outline" onPress={() => { forgetBook(userId, item.bookId); reload(); }} />
              </View>
            ))
          )}
          {local.length > 0 && !confirm ? <Button label="Remove all" variant="outline" onPress={() => setConfirm(true)} /> : null}
          {confirm ? (
            <View style={styles.deviceRow}>
              <Button label="Remove all books on this device" onPress={() => { forgetUser(userId); setConfirm(false); reload(); }} />
              <Button label="Cancel" variant="outline" onPress={() => setConfirm(false)} />
            </View>
          ) : null}
        </ScrollView>
      )}
      <Toast item={notice} onDone={dismiss} />
    </View>
  );
}

function ViewToggle({ value, onChange }: { value: ViewName; onChange: (next: ViewName) => void }) {
  const items: { id: ViewName; label: string }[] = [
    { id: "library", label: "Library" },
    { id: "downloaded", label: "Downloaded" },
  ];
  return (
    <View accessibilityRole="tablist" style={styles.toggle}>
      {items.map((item) => {
        const on = value === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(item.id)}
            style={[styles.toggleItem, on && styles.toggleOn]}
          >
            <Text style={[styles.toggleLabel, on && styles.toggleLabelOn]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  page: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    marginBottom: 8,
    gap: 12,
  },
  row: {
    gap: 16,
  },
  cell: {
    flex: 1,
  },
  device: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 4,
  },
  note: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  book: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: colors.ink },
  deviceRow: { gap: 8 },
  toggle: { flexDirection: "row", gap: 8 },
  toggleItem: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: colors.primary },
  toggleLabel: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  toggleLabelOn: { color: colors.onPrimary },
});
