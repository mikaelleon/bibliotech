import { ArrowLeft, BookOpen, Bookmark, Download, Info } from "lucide-react-native";
import { Link, Redirect, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Banner } from "@/components/Banner";
import { BookCover } from "@/components/BookCover";
import { Button } from "@/components/Button";
import { FavoriteButton } from "@/components/FavoriteButton";
import { EmptyState } from "@/components/EmptyState";
import { FadeIn } from "@/components/FadeIn";
import { TabBar } from "@/components/TabBar";
import { getBook } from "@/lib/books";
import { leftLabel, quotaFor } from "@/lib/quota";
import { useSession } from "@/lib/session";
import { colors, font } from "@/theme/tokens";
import * as Linking from "expo-linking";

export default function BookScreen() {
  const { session } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const book = typeof id === "string" ? getBook(id) : undefined;

  if (session.kind === "none") return <Redirect href="/login" />;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {book ? <BookBody id={book.id} /> : <Missing />}
      <TabBar />
    </SafeAreaView>
  );
}

function BookBody({ id }: { id: string }) {
  const { session, favoriteIds, toggleFavorite } = useSession();
  const book = getBook(id);
  if (!book) return null;
  const summary = book.summaryShort ?? book.summary;
  const saved = favoriteIds.includes(book.id);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Link href="/browse" asChild>
        <Pressable accessibilityRole="link" accessibilityLabel="Back to Browse" style={styles.back}>
          <ArrowLeft color={colors.muted} size={16} strokeWidth={1.5} />
          <Text style={styles.backLabel}>Back to Browse</Text>
        </Pressable>
      </Link>
      <FadeIn style={styles.cover}>
        <BookCover book={book} />
      </FadeIn>
      {/* The details settle in order once the cover is in: 80ms, then 30ms apart. */}
      <FadeIn start={settle} index={0}>
        <Text style={styles.title}>{book.title}</Text>
      </FadeIn>
      <FadeIn start={settle} index={1}>
        <Text style={styles.author}>{book.author}</Text>
      </FadeIn>
      <FadeIn start={settle} index={2} style={styles.meta}>
        <Meta term="Category" value={book.category} />
        <Meta term="Language" value={book.language} />
        <Meta term="License" value={book.license} />
        <View style={styles.metaRow}>
          <Text style={styles.term}>Source</Text>
          <Text
            accessibilityRole="link"
            onPress={() => void Linking.openURL(book.sourceUrl)}
            style={styles.source}
          >
            {book.sourceName}
          </Text>
        </View>
      </FadeIn>
      <FadeIn start={settle} index={3}>
        <Text style={styles.summary}>{summary}</Text>
      </FadeIn>
      {session.kind === "guest" ? (
        <View style={styles.banner}>
          <Banner icon={<Info color={colors.ink} size={20} strokeWidth={1.5} />}>
            5 of 5 guest downloads left. A free account gets 10.
          </Banner>
        </View>
      ) : null}
      {session.kind === "user" ? (
        <View style={styles.banner}>
          <Banner icon={<Info color={colors.ink} size={20} strokeWidth={1.5} />}>
            {leftLabel(quotaFor(session)?.left ?? 0)} of 10.
          </Banner>
        </View>
      ) : null}
      <FadeIn start={settle} index={4} style={styles.actions}>
        <Button
          label="Download"
          full
          disabled
          icon={<Download />}
          iconPosition="start"
          accessibilityLabel="Download"
        />
        <Button
          label="Save to Library"
          variant="outline"
          full
          disabled
          icon={<Bookmark />}
          iconPosition="start"
        />
        {session.kind === "user" ? (
          <FavoriteButton active={saved} onPress={() => toggleFavorite(book.id)} />
        ) : null}
      </FadeIn>
      <Text style={styles.note}>Downloads arrive in Phase 2.</Text>
    </ScrollView>
  );
}

/** Delay before the detail column starts, so it follows the cover. */
const settle = 80;

function Meta({ term, value }: { term: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.term}>{term}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function Missing() {
  return (
    <View style={styles.missing}>
      <EmptyState
        icon={<BookOpen color={colors.muted} size={24} strokeWidth={1.5} />}
        title="This book isn’t in the library"
        action={<Button label="Back to Browse" href="/browse" variant="outline" />}
      >
        It may have been removed.
      </EmptyState>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  back: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  backLabel: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  cover: {
    width: 192,
    marginTop: 8,
  },
  title: {
    marginTop: 24,
    fontFamily: font.serif,
    fontSize: 32,
    lineHeight: 40,
    color: colors.ink,
  },
  author: {
    marginTop: 4,
    fontFamily: font.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
  meta: {
    marginTop: 16,
  },
  metaRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 8,
  },
  term: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  value: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  source: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.atext,
    textDecorationLine: "underline",
  },
  summary: {
    marginTop: 16,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  banner: {
    marginTop: 24,
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
  note: {
    marginTop: 8,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  missing: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
});
