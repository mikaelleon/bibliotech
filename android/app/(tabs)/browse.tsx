import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { SearchX } from "lucide-react-native";
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { BookCard } from "@/components/BookCard";
import { CardFavorite } from "@/components/CardFavorite";
import { SignUpPrompt, type ShelfKind } from "@/components/SignUpPrompt";
import { FadeIn, useFreshList } from "@/components/FadeIn";
import { Button } from "@/components/Button";
import { CategoryFilter } from "@/components/CategoryFilter";
import { EmptyState } from "@/components/EmptyState";
import { FeaturedShelf } from "@/components/FeaturedShelf";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { filterBooks, getBooks } from "@/lib/books";
import { useCatalogBooks } from "@/lib/catalog";
import { CATEGORIES, type Category } from "@/lib/types";
import { colors, font } from "@/theme/tokens";

const pageSize = 24;

export default function BrowseScreen() {
  const fresh = useFreshList();
  const [asking, setAsking] = useState<ShelfKind | null>(null);
  const [page, setPage] = useState(1);
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const rawCategory = typeof params.category === "string" ? params.category : "";
  const category = CATEGORIES.includes(rawCategory as Category) ? rawCategory : undefined;
  const catalog = useCatalogBooks();
  const books = filterBooks(catalog.length ? catalog : getBooks(), query, category);
  const searching = query.length > 0;
  const scope = `${query}|${category ?? ""}`;
  const [seen, setSeen] = useState(scope);
  if (seen !== scope) {
    setSeen(scope);
    setPage(1);
  }
  const showPages = !searching && !category && books.length > pageSize;
  const visible = showPages ? books.slice((page - 1) * pageSize, page * pageSize) : books;
  const pages = Math.max(1, Math.ceil(books.length / pageSize));
  const current = Math.min(page, pages);
  const { width } = useWindowDimensions();
  const cellWidth = (width - 32 - 16) / 2;

  return (
    <>
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={visible.length > 0 ? styles.columns : undefined}
      contentContainerStyle={styles.content}
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      ListHeaderComponent={
        <View>
          {!searching ? <VerifyEmailBanner /> : null}
          {searching ? (
            <Text style={styles.results}>Results for “{query}”</Text>
          ) : (
            <FeaturedShelf books={catalog} />
          )}
          <CategoryFilter selected={category} />
        </View>
      }
      ListFooterComponent={
        showPages ? (
          <View style={styles.pages}>
            <Text style={styles.pageLabel}>{(current - 1) * pageSize + 1} to {Math.min(current * pageSize, books.length)} of {books.length}</Text>
            <View style={styles.pageButtons}>
              <Button label="Previous" variant="outline" disabled={current <= 1} onPress={() => setPage(current - 1)} />
              <Button label="Next" variant="outline" disabled={current >= pages} onPress={() => setPage(current + 1)} />
            </View>
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        <EmptyState
          icon={<SearchX color={colors.muted} size={24} strokeWidth={1.5} />}
          title={searching ? `No matches for “${query}”` : `No books in ${category ?? "this category"}`}
          action={
            <Button
              label={searching ? "Clear search" : "Show all books"}
              variant="outline"
              onPress={() => router.setParams({ q: "", category: "" })}
            />
          }
        >
          {searching ? "Check the spelling or search by author." : "Try another category."}
        </EmptyState>
      }
      renderItem={({ item, index }) => (
        <FadeIn index={index} skip={!fresh} style={[styles.cell, { width: cellWidth }]}>
          <BookCard book={item} showCategory corner={<CardFavorite book={item} onLocked={setAsking} />} />
        </FadeIn>
      )}
    />
    <SignUpPrompt kind={asking} onClose={() => setAsking(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  columns: {
    gap: 16,
  },
  cell: {
    marginBottom: 24,
  },
  results: {
    fontFamily: font.title,
    fontSize: 28,
    lineHeight: 36,
    color: colors.ink,
  },
  pages: {
    gap: 12,
    paddingTop: 8,
  },
  pageLabel: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  pageButtons: {
    flexDirection: "row",
    gap: 8,
  },
});
