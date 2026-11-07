import { Heart } from "lucide-react-native";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { BookCard } from "@/components/BookCard";
import { FadeIn, useFreshList } from "@/components/FadeIn";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { FavoriteButton } from "@/components/FavoriteButton";
import { LockedPanel } from "@/components/LockedPanel";
import { PageHeader } from "@/components/PageHeader";
import { Toast, type ToastItem } from "@/components/Toast";
import { getBook } from "@/lib/books";
import { useSession } from "@/lib/session";
import type { Book } from "@/lib/types";
import { colors } from "@/theme/tokens";

export default function FavoritesScreen() {
  const { session, favoriteIds, toggleFavorite } = useSession();
  const [notice, setNotice] = useState<ToastItem | null>(null);
  const [nextId, setNextId] = useState(1);
  const fresh = useFreshList();
  const dismiss = useCallback(() => setNotice(null), []);
  if (session.kind !== "user") return <LockedPanel title="Favorites" />;

  const books = favoriteIds.map((id) => getBook(id)).filter((book): book is Book => Boolean(book));
  const count = books.length === 1 ? "1 book you've saved." : `${books.length} books you've saved.`;

  return (
    <View style={styles.wrap}>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.page}
        columnWrapperStyle={books.length > 0 ? styles.row : undefined}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageHeader title="Favorites" lede={count} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Heart color={colors.muted} size={24} strokeWidth={1.5} />}
            title="No favorites yet"
            action={<Button label="Browse books" href="/browse" variant="outline" />}
          >
            Tap the heart on any book to keep it here.
          </EmptyState>
        }
        renderItem={({ item, index }) => (
          <FadeIn index={index} skip={!fresh} style={styles.cell}>
            <BookCard
              book={item}
              corner={
                <FavoriteButton
                  active
                  onPress={() => {
                    toggleFavorite(item.id);
                    setNotice({
                      id: nextId,
                      message: "Removed from favorites",
                      actionLabel: "Undo",
                      onAction: () => toggleFavorite(item.id),
                    });
                    setNextId((id) => id + 1);
                  }}
                />
              }
            />
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
  header: { marginBottom: 8 },
  row: { gap: 16 },
  cell: { flex: 1 },
});
