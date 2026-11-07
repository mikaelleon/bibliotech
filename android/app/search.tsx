import { Redirect, useLocalSearchParams } from "expo-router";
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
import { filterBooks, getBooks } from "@/lib/books";
import { useSession } from "@/lib/session";
import { colors, font } from "@/theme/tokens";
import { SearchX } from "lucide-react-native";

const pageSize = 24;

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

  if (session.kind === "none") return <Redirect href="/login" />;

  const matches = filterBooks(getBooks(), query, category || undefined);
  const visible = matches.slice(0, shown);

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
