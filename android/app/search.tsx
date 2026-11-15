import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCard } from "@/components/BookCard";
import { CardFavorite } from "@/components/CardFavorite";
import { SignUpPrompt, type ShelfKind } from "@/components/SignUpPrompt";
import { FadeIn, useFreshList } from "@/components/FadeIn";
import { CategoryFilter } from "@/components/CategoryFilter";
import { EmptyState } from "@/components/EmptyState";
import { SearchBar } from "@/components/SearchBar";
import { filterBooks, getBooks, type Book } from "@/lib/books";
import { useCatalogBooks } from "@/lib/catalog";
import { useSession } from "@/lib/session";
import { colors, font, radius } from "@/theme/tokens";
import { SearchX } from "lucide-react-native";

const pageSize = 24;

/** Up to six title/author matches, prefix matches first. */
function suggest(list: Book[], term: string): Book[] {
  const q = term.toLowerCase();
  const scored: { score: number; book: Book }[] = [];
  for (const book of list) {
    const title = book.title.toLowerCase();
    const author = book.author.toLowerCase();
    let score = -1;
    if (title.startsWith(q)) score = 0;
    else if (author.startsWith(q)) score = 1;
    else if (title.split(/\s+/).some((w) => w.startsWith(q))) score = 2;
    else if (title.includes(q)) score = 3;
    else if (author.includes(q)) score = 4;
    if (score >= 0) scored.push({ score, book });
  }
  scored.sort((a, b) => a.score - b.score || a.book.title.localeCompare(b.book.title));
  return scored.slice(0, 6).map((s) => s.book);
}

export default function SearchScreen() {
  const { session } = useSession();
  const fresh = useFreshList();
  const [asking, setAsking] = useState<ShelfKind | null>(null);
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const initial = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "";
  const [text, setText] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [shown, setShown] = useState(pageSize);
  const catalog = useCatalogBooks();

  if (session.kind === "none") return <Redirect href="/login" />;
  const matches = filterBooks(catalog.length ? catalog : getBooks(), query, category || undefined);
  const visible = matches.slice(0, shown);
  const term = text.trim();
  const suggestions =
    term && term !== query ? suggest(catalog.length ? catalog : getBooks(), term) : [];

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        numColumns={2}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.page}
        columnWrapperStyle={visible.length > 0 ? styles.row : undefined}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{query ? `Results for “${query}”` : "Search"}</Text>
            <Text style={styles.lede}>
              {query ? (matches.length === 1 ? "1 book" : `${matches.length} books`) : "Search by title or author."}
            </Text>
            <SearchBar
              value={text}
              onChangeText={setText}
              onSubmit={() => {
                setQuery(text.trim());
                setShown(pageSize);
              }}
              autoFocus
            />
            {suggestions.length > 0 ? (
              <View style={styles.suggestions} accessibilityRole="list">
                {suggestions.map((book) => (
                  <Pressable
                    key={book.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${book.title} by ${book.author}`}
                    onPress={() => router.push({ pathname: "/book/[id]", params: { id: book.id } })}
                    style={styles.suggestion}
                  >
                    <Text style={styles.suggestionTitle} numberOfLines={1}>{book.title}</Text>
                    <Text style={styles.suggestionAuthor} numberOfLines={1}>{book.author}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <CategoryFilter selected={category} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<SearchX color={colors.muted} size={24} strokeWidth={1.5} />}
            title={query.trim() ? `No matches for “${query.trim()}”` : "No books match that search"}
          >
            Check the spelling or search by author.
          </EmptyState>
        }
        ListFooterComponent={
          visible.length < matches.length ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show more"
              onPress={() => setShown((count) => count + pageSize)}
              style={styles.more}
            >
              <Text style={styles.moreLabel}>Show more</Text>
            </Pressable>
          ) : undefined
        }
        renderItem={({ item, index }) => (
          <FadeIn index={index} skip={!fresh} style={styles.cell}>
            <BookCard book={item} corner={<CardFavorite book={item} onLocked={setAsking} />} />
          </FadeIn>
        )}
      />
      <SignUpPrompt kind={asking} onClose={() => setAsking(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
  header: { gap: 12, paddingTop: 16, marginBottom: 8 },
  title: {
    fontFamily: font.title,
    fontSize: 28,
    lineHeight: 36,
    color: colors.ink,
  },
  lede: {
    fontFamily: font.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
  suggestions: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  suggestion: { minHeight: 48, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 6 },
  suggestionTitle: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  suggestionAuthor: { fontFamily: font.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
  row: { gap: 16 },
  cell: { flex: 1 },
  more: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  moreLabel: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
});
