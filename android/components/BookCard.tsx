import { Link } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BookCover } from "@/components/BookCover";
import type { Book } from "@/lib/types";
import { colors, font } from "@/theme/tokens";

type BookCardProps = {
  book: Book;
  showCategory?: boolean;
  corner?: ReactNode;
};

export function BookCard({ book, showCategory = false, corner }: BookCardProps) {
  const label = showCategory
    ? `${book.title} by ${book.author}, ${book.category}`
    : `${book.title} by ${book.author}`;

  return (
    <View>
      <Link href={{ pathname: "/book/[id]", params: { id: book.id } }} asChild>
        <Pressable accessibilityRole="link" accessibilityLabel={label} style={({ pressed }) => pressed && styles.pressed}>
          <BookCover book={book} decorative />
          <Text numberOfLines={2} style={styles.title}>
            {book.title}
          </Text>
          <Text numberOfLines={1} style={styles.author}>
            {book.author}
          </Text>
          {showCategory ? <Text style={styles.category}>{book.category}</Text> : null}
        </Pressable>
      </Link>
      {corner ? <View style={styles.corner}>{corner}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  corner: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  title: {
    marginTop: 12,
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  author: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  category: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
});
