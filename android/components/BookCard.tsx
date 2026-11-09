import { Link } from "expo-router";
import { Check } from "lucide-react-native";
import type { ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { BookCover } from "@/components/BookCover";
import { usePressScale } from "@/hooks/use-press-scale";
import type { Book } from "@/lib/types";
import { colors, font } from "@/theme/tokens";

type BookCardProps = {
  book: Book;
  showCategory?: boolean;
  corner?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
};

export function BookCard({ book, showCategory = false, corner, onPress, onLongPress, selected = false }: BookCardProps) {
  const label = showCategory
    ? `${book.title} by ${book.author}, ${book.category}`
    : `${book.title} by ${book.author}`;
  const press = usePressScale(0.98);
  const body = (
    <Pressable
      {...press.handlers}
      {...(onPress ? { onPress } : {})}
      {...(onLongPress ? { onLongPress } : {})}
      delayLongPress={350}
      accessibilityRole={onPress ? "button" : "link"}
      accessibilityLabel={onPress ? `${selected ? "Deselect" : "Select"} ${book.title}` : label}
      accessibilityState={onPress ? { selected } : undefined}
    >
      <BookCover book={book} decorative />
      {selected ? (
        <View style={styles.mark}>
          <Check color={colors.bg} size={14} strokeWidth={2.5} />
        </View>
      ) : null}
      <Text numberOfLines={2} style={styles.title}>
        {book.title}
      </Text>
      <Text numberOfLines={1} style={styles.author}>
        {book.author}
      </Text>
      {showCategory ? <Text style={styles.category}>{book.category}</Text> : null}
    </Pressable>
  );

  return (
    <View style={selected ? styles.picked : undefined}>
      <Animated.View style={{ transform: [{ scale: press.scale }] }}>
        {onPress ? body : (
          <Link href={{ pathname: "/book/[id]", params: { id: book.id } }} asChild>
            {body}
          </Link>
        )}
      </Animated.View>
      {corner && !onPress ? <View style={styles.corner}>{corner}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  mark: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  picked: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.ink,
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
