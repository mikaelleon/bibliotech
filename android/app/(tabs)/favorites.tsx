import { Heart } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { FavoriteButton } from "@/components/FavoriteButton";
import { LockedPanel } from "@/components/LockedPanel";
import { PageHeader } from "@/components/PageHeader";
import { getBook } from "@/lib/books";
import { useSession } from "@/lib/session";
import type { Book } from "@/lib/types";
import { colors, font } from "@/theme/tokens";

export default function FavoritesScreen() {
  const { session, favoriteIds, toggleFavorite } = useSession();
  const [notice, setNotice] = useState<Book | null>(null);
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
            title="No favorites yet."
            action={<Button label="Browse books" href="/browse" variant="outline" />}
          >
            Open a book and choose Save to add it here.
          </EmptyState>
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <BookCard
              book={item}
              corner={
                <FavoriteButton
                  active
                  onPress={() => {
                    toggleFavorite(item.id);
                    setNotice(item);
                  }}
                />
              }
            />
          </View>
        )}
      />
      {notice ? (
        <View accessibilityRole="alert" style={styles.toast}>
          <Text style={styles.toastText}>Removed from favorites.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Undo"
            onPress={() => {
              toggleFavorite(notice.id);
              setNotice(null);
            }}
          >
            <Text style={styles.undo}>Undo</Text>
          </Pressable>
        </View>
      ) : null}
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
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toastText: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  undo: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.atext,
    textDecorationLine: "underline",
  },
});
