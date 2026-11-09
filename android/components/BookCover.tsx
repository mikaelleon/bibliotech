import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Skeleton } from "@/components/Skeleton";
import { coverColors } from "@/lib/cover";
import { displayTitle } from "@/lib/title";
import type { Book } from "@/lib/types";
import { colors, font, radius } from "@/theme/tokens";

type BookCoverProps = {
  book: Book;
  decorative?: boolean;
};

export function BookCover({ book, decorative = false }: BookCoverProps) {
  const [width, setWidth] = useState(0);
  const palette = coverColors(book.id);
  const title = displayTitle(book.title);
  const label = `Cover of ${book.title} by ${book.author}`;

  return (
    <View
      accessibilityRole={decorative ? undefined : "image"}
      accessibilityLabel={decorative ? undefined : label}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "yes"}
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width);
        if (next > 0 && next !== width) setWidth(next);
      }}
      style={styles.frame}
    >
      {width === 0 ? (
        <Skeleton style={styles.pending} />
      ) : (
        <View
          style={[
            styles.cover,
            {
              backgroundColor: palette.background,
              padding: width * 0.09,
            },
          ]}
        >
          <View
            style={{
              width: width * 0.18,
              height: Math.max(1, width * 0.015),
              backgroundColor: palette.color,
              opacity: 0.6,
            }}
          />
          <View>
            <Text
              numberOfLines={6}
              style={{
                color: palette.color,
                fontFamily: font.serif,
                fontSize: title.length > 48 ? width * 0.085 : width * 0.12,
                lineHeight: (title.length > 48 ? width * 0.085 : width * 0.12) * 1.1,
              }}
            >
              {title}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                marginTop: 4,
                color: palette.color,
                fontFamily: font.sans,
                fontSize: width * 0.07,
                lineHeight: width * 0.07 * 1.3,
                letterSpacing: width * 0.07 * 0.04,
                textTransform: "uppercase",
              }}
            >
              {book.author}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
  },
  pending: {
    width: "100%",
    aspectRatio: 2 / 3,
  },
  cover: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: radius.cover,
    justifyContent: "space-between",
    overflow: "hidden",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
});
