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
  selecting?: boolean;
  progress?: number;
  onDevice?: boolean;
};

export function BookCard({
  book,
  showCategory = false,
  corner,
  onPress,
  onLongPress,
  selected = false,
  selecting = false,
  progress,
  onDevice = false,
}: BookCardProps) {
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
      {selecting ? (
        <View style={[styles.mark, selected ? styles.markOn : styles.markOff]}>
          {selected ? <Check color={colors.bg} size={14} strokeWidth={2.5} /> : null}
        </View>
      ) : null}
      {progress !== undefined ? <View style={styles.track}><View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} /></View> : null}
      <Text numberOfLines={2} style={styles.title}>
        {book.title}
      </Text>
      <Text numberOfLines={1} style={styles.author}>
        {book.author}
      </Text>
      {progress !== undefined ? <Text style={styles.category}>{progress >= 1 ? "Finished" : `${Math.round(progress * 100)}%`}</Text> : null}
      {onDevice ? <Text style={styles.category}>On this device</Text> : null}
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
      {corner ? <View style={styles.corner}>{corner}</View> : null}
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
    borderWidth: 2,
    borderColor: "#20232F",
    alignItems: "center",
    justifyContent: "center",
  },
  markOff: { backgroundColor: "#FFFFFF" },
  markOn: { backgroundColor: "#20232F" },
  track: { marginTop: 8, height: 2, borderRadius: 1, backgroundColor: colors.line, overflow: "hidden" },
  fill: { height: 2, backgroundColor: colors.ink },
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
