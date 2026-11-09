import { useNetworkState } from "expo-network";
import { Library } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BookCard } from "@/components/BookCard";
import { CardMarks } from "@/components/CardMarks";
import { FadeIn, useFreshList } from "@/components/FadeIn";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { LockedPanel } from "@/components/LockedPanel";
import { PageHeader } from "@/components/PageHeader";
import { getBook } from "@/lib/books";
import { useCatalogBooks } from "@/lib/catalog";
import { forgetBook, forgetUser, localBooks, type LocalBook } from "@/lib/local-books";
import { useSession } from "@/lib/session";
import type { Book } from "@/lib/types";
import { colors, font, radius } from "@/theme/tokens";

type ViewName = "library" | "downloaded";

export default function LibraryScreen() {
  const { session, libraryIds } = useSession();
  const fresh = useFreshList();
  const [view, setView] = useState<ViewName>("library");
  const [confirm, setConfirm] = useState(false);
  const userId = session.kind === "user" ? session.id : "";
  const [local, setLocal] = useState<LocalBook[]>(() => localBooks(userId));
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

  function asBook(item: LocalBook): Book {
    return getBook(item.bookId) ?? {
      id: item.bookId,
      title: item.title,
      author: item.author,
      category: "Fiction",
      language: "English",
      license: "Public domain",
      sourceName: "",
      sourceUrl: "",
      summary: "",
    };
  }

  function deviceGrid(items: LocalBook[]) {
    return (
      <View style={styles.grid}>
        {items.map((item) => {
          const book = asBook(item);
          return (
            <View key={item.bookId} style={styles.gridCell}>
              <BookCard book={book} showCategory corner={<CardMarks book={book} downloaded />} />
              <Button label="Remove" variant="outline" onPress={() => { forgetBook(userId, item.bookId); reload(); }} />
            </View>
          );
        })}
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <PageHeader
        title="Library"
        lede={view === "downloaded" || (books.length === 0 && local.length > 0) ? "Books saved on this device." : count}
      />
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
            local.length > 0 ? deviceGrid(local) : (
            <EmptyState
              icon={<Library color={colors.muted} size={24} strokeWidth={1.5} />}
              title="Your Library is empty"
              action={<Button label="Browse books" href="/browse" variant="outline" />}
            >
              Open a book and choose Add to Library. It doesn’t use a download.
            </EmptyState>
            )
          }
          columnWrapperStyle={books.length > 0 ? styles.row : undefined}
          renderItem={({ item, index }) => (
            <FadeIn index={index} skip={!fresh} style={styles.cell}>
              <BookCard book={item} showCategory corner={<CardMarks book={item} downloaded={onDevice.has(item.id)} />} />
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
            deviceGrid(local)
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  gridCell: { width: "47%", gap: 8 },
  note: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  book: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: colors.ink },
  deviceRow: { gap: 8 },
  deviceBlock: { gap: 16 },
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
