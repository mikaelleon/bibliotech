import { useNetworkState } from "expo-network";
import { type Href } from "expo-router";
import { Library } from "lucide-react-native";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

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
import { localBooks } from "@/lib/local-books";
import { useSession } from "@/lib/session";
import { colors, font } from "@/theme/tokens";

export default function LibraryScreen() {
  const { session, libraryIds, setInLibrary } = useSession();
  const fresh = useFreshList();
  const [notice, setNotice] = useState<ToastItem | null>(null);
  const [nextId, setNextId] = useState(1);
  const dismiss = useCallback(() => setNotice(null), []);
  useCatalogBooks();
  const network = useNetworkState();
  if (session.kind !== "user") return <LockedPanel title="Library" />;

  const offline = network.isInternetReachable === false;
  const onDevice = new Set(localBooks(session.id).map((item) => item.bookId));
  const books = libraryIds
    .map((id) => getBook(id))
    .filter((book) => book !== undefined)
    .filter((book) => !offline || onDevice.has(book.id));
  const count = books.length === 1 ? "1 book in your Library" : `${books.length} books in your Library`;

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

  return (
    <View style={styles.wrap}>
    <FlatList
      data={books}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.page}
      ListHeaderComponent={
        <View style={styles.header}>
          <PageHeader title="Library" lede={count} />
          <Button label="Downloads" href={"/downloads" as Href} variant="outline" />
        </View>
      }
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
    <Toast item={notice} onDone={dismiss} />
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
});
