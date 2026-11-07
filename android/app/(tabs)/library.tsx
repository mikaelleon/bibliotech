import { Library } from "lucide-react-native";
import { FlatList, StyleSheet, View } from "react-native";

import { BookCard } from "@/components/BookCard";
import { FadeIn, useFreshList } from "@/components/FadeIn";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { LockedPanel } from "@/components/LockedPanel";
import { PageHeader } from "@/components/PageHeader";
import { getBook } from "@/lib/books";
import { useSession } from "@/lib/session";
import { colors } from "@/theme/tokens";

export default function LibraryScreen() {
  const { session, libraryIds } = useSession();
  const fresh = useFreshList();
  if (session.kind !== "user") return <LockedPanel title="My Library" />;

  const books = libraryIds.map((id) => getBook(id)).filter((book) => book !== undefined);
  const count = books.length === 1 ? "1 book you've saved." : `${books.length} books you've saved.`;

  return (
    <FlatList
      data={books}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.page}
      ListHeaderComponent={
        <View style={styles.header}>
          <PageHeader title="My Library" lede={count} />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon={<Library color={colors.muted} size={24} strokeWidth={1.5} />}
          title="Your library is empty"
          action={<Button label="Browse books" href="/browse" variant="outline" />}
        >
          Books you save show up here.
        </EmptyState>
      }
      columnWrapperStyle={books.length > 0 ? styles.row : undefined}
      renderItem={({ item, index }) => (
        <FadeIn index={index} skip={!fresh} style={styles.cell}>
          <BookCard book={item} />
        </FadeIn>
      )}
    />
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    marginBottom: 8,
  },
  row: {
    gap: 16,
  },
  cell: {
    flex: 1,
  },
});
