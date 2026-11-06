import { useLocalSearchParams, useRouter } from "expo-router";
import { SearchX } from "lucide-react-native";
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/Button";
import { CategoryFilter } from "@/components/CategoryFilter";
import { EmptyState } from "@/components/EmptyState";
import { FeaturedShelf } from "@/components/FeaturedShelf";
import { filterBooks, getBooks } from "@/lib/books";
import { CATEGORIES, type Category } from "@/lib/types";
import { colors, font } from "@/theme/tokens";

export default function BrowseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const rawCategory = typeof params.category === "string" ? params.category : "";
  const category = CATEGORIES.includes(rawCategory as Category) ? rawCategory : undefined;
  const books = filterBooks(getBooks(), query, category);
  const searching = query.length > 0;
  const { width } = useWindowDimensions();
  const cellWidth = (width - 32 - 16) / 2;

  return (
    <FlatList
      data={books}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={books.length > 0 ? styles.columns : undefined}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View>
          {searching ? (
            <Text style={styles.results}>Results for “{query}”</Text>
          ) : (
            <FeaturedShelf books={getBooks()} />
          )}
          <CategoryFilter selected={category} />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon={<SearchX color={colors.muted} size={24} strokeWidth={1.5} />}
          title={searching ? "No books match that search." : "No books in this category."}
          action={
            <Button
              label="Clear search and filters"
              variant="outline"
              onPress={() => router.setParams({ q: "", category: "" })}
            />
          }
        >
          {searching
            ? "Check the spelling, try an author’s last name, or remove the category filter."
            : "Pick another category, or clear the filter to see the full library."}
        </EmptyState>
      }
      renderItem={({ item }) => (
        <View style={[styles.cell, { width: cellWidth }]}>
          <BookCard book={item} showCategory />
        </View>
      )}
    />
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
    fontFamily: font.serif,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.32,
    color: colors.ink,
  },
});
