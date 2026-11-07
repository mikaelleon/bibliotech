import { ArrowRight } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/Button";
import type { Book } from "@/lib/types";
import { colors, font } from "@/theme/tokens";

export function FeaturedShelf({ books }: { books: Book[] }) {
  const { width: pageWidth } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const focal = books[index] ?? books[0];

  if (!focal) return null;

  return (
    <View accessibilityLabel="Featured books">
      <Text style={styles.title}>Featured books</Text>
      <Button
        label={`View ${focal.title}`}
        href={{ pathname: "/book/[id]", params: { id: focal.id } }}
        icon={<ArrowRight />}
        style={styles.view}
      />
      <ScrollView
        horizontal
        pagingEnabled
        snapToInterval={pageWidth}
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
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
            style={[styles.page, { width: pageWidth }]}
          >
            {[0, 1, 2].map((offset) => {
              const book = books[page + offset];
              if (!book) return null;
              const coverWidth = offset === 0 ? 160 : 112;
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
    fontFamily: font.serif,
    fontSize: 32,
    lineHeight: 40,
    color: colors.ink,
  },
  view: {
    marginTop: 16,
  },
  row: {
    marginTop: 24,
    marginHorizontal: -16,
    height: 320,
  },
  page: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingLeft: 16,
    overflow: "hidden",
  },
  count: {
    marginTop: 16,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.atext,
  },
});
