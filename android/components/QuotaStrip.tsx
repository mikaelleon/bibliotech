import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useSession } from "@/lib/session";
import { colors, font } from "@/theme/tokens";

export function QuotaStrip() {
  const { session } = useSession();
  const router = useRouter();

  if (session.kind === "none") return null;

  if (session.kind === "guest") {
    return (
      <View style={styles.bar}>
        <Text style={styles.muted}>
          Guest: 5 downloads left.{" "}
          <Text
            accessibilityRole="link"
            onPress={() => router.push("/register")}
            style={styles.link}
          >
            Sign up
          </Text>{" "}
          for 10.
        </Text>
      </View>
    );
  }

  const used = session.downloadsUsed;
  const width = `${Math.max(0, Math.min(100, (used / 10) * 100))}%` as const;

  return (
    <View style={styles.bar}>
      <Text style={styles.muted}>{used} of 10 downloads used</Text>
      <View accessibilityElementsHidden style={styles.track}>
        <View style={[styles.fill, { width }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.bg,
  },
  muted: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  link: {
    fontFamily: font.medium,
    color: colors.atext,
    textDecorationLine: "underline",
  },
  track: {
    height: 4,
    width: 128,
    borderRadius: 999,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  fill: {
    height: 4,
    backgroundColor: colors.accent,
  },
});
