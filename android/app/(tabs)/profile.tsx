import { LogOut } from "lucide-react-native";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { DefinitionList } from "@/components/DefinitionList";
import { LockedPanel } from "@/components/LockedPanel";
import { useSession } from "@/lib/session";
import { colors, font, radius } from "@/theme/tokens";

export default function ProfileScreen() {
  const router = useRouter();
  const { session, logout } = useSession();
  if (session.kind !== "user") return <LockedPanel title="Profile" />;

  const used = session.downloadsUsed;
  const width = `${Math.max(0, Math.min(100, (used / 10) * 100))}%` as const;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Profile</Text>
      <DefinitionList
        card
        items={[
          { term: "Display name", value: session.name },
          { term: "Email", value: session.email },
          { term: "Account type", value: session.role === "admin" ? "Admin" : "Registered user" },
        ]}
      />
      <View style={styles.card}>
        <Text style={styles.usage}>Download usage</Text>
        <Text style={styles.note}>Registered accounts get 10 downloads.</Text>
        <View style={styles.meter}>
          <Text style={styles.meterText}>{used} of 10 downloads used</Text>
          <View accessibilityElementsHidden style={styles.track}>
            <View style={[styles.fill, { width }]} />
          </View>
        </View>
      </View>
      <Button
        label="Log out"
        variant="outline"
        icon={<LogOut />}
        iconPosition="start"
        onPress={() => {
          logout();
          router.replace("/login");
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 24,
  },
  title: {
    fontFamily: font.serif,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.32,
    color: colors.ink,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: 24,
  },
  usage: {
    fontFamily: font.medium,
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
  },
  note: {
    marginTop: 4,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  meter: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  meterText: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
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
