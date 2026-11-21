import { ArrowRight } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/Button";
import { displayTitle } from "@/lib/title";
import type { Book } from "@/lib/types";
import { colors, font } from "@/theme/tokens";

const focalWidth = 160;
const neighborWidth = 112;
const gap = 16;

/** How many covers fit on one page: the large one, then neighbors that still clear the edge. */
function slotsFor(width: number): number {
  let slots = 1;
  let used = gap + focalWidth;
  while (slots < 3 && used + gap + neighborWidth <= width) {
    used += gap + neighborWidth;
    slots += 1;
  }
  return slots;
}

export function FeaturedShelf({ books }: { books: Book[] }) {
  const { width: windowWidth } = useWindowDimensions();
  const [shelfWidth, setShelfWidth] = useState(windowWidth);
  const [index, setIndex] = useState(0);
  const focal = books[index] ?? books[0];
  const slots = slotsFor(shelfWidth);

  if (!focal) return null;

  return (
    <View accessibilityLabel="Featured books">
      <Text style={styles.title}>Featured books</Text>
      <Button
        full
        numberOfLines={2}
        label={`View ${displayTitle(focal.title)}`}
        accessibilityLabel={`View ${focal.title}`}
        href={{ pathname: "/book/[id]", params: { id: focal.id } }}
        icon={<ArrowRight />}
        style={styles.view}
      />
      <ScrollView
        horizontal
        pagingEnabled
        snapToInterval={shelfWidth}
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.width);
          if (next > 0 && next !== shelfWidth) setShelfWidth(next);
        }}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(shelfWidth, 1));
          setIndex(Math.max(0, Math.min(books.length - 1, next)));
        }}
        style={styles.row}
      >
        {books.map((item, page) => (
          <View
            key={item.id}
            accessibilityElementsHidden={page !== index}
            aria-hidden={page !== index}
            importantForAccessibility={page === index ? "auto" : "no-hide-descendants"}
            style={[styles.page, { width: shelfWidth }]}
          >
            {Array.from({ length: slots }, (_, offset) => {
              const book = books[page + offset];
              if (!book) return null;
              const coverWidth = offset === 0 ? focalWidth : neighborWidth;
              return (
                <View key={book.id} style={{ width: coverWidth }}>
                  <BookCard book={book} />
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <Text accessibilityLabel={`${index + 1} of ${books.length} books`} style={styles.count}>
        {index + 1} / {books.length} books
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: font.title,
    fontSize: 28,
    lineHeight: 36,
    color: colors.ink,
  },
  view: {
    marginTop: 16,
  },
  row: {
    marginTop: 24,
    marginHorizontal: -16,
  },
  page: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingLeft: 16,
    paddingBottom: 8,
  },
  count: {
    marginTop: 16,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
});
