import { useRouter, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, font } from "@/theme/tokens";

export default function TermsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
        <Text style={styles.title}>Terms and Conditions</Text>
        <Text style={styles.body}>A Bibliotech account is for reading the catalog. The books offered for download are in the public domain.</Text>
        <Text style={styles.body}>The first time you save a book, it uses one download. Saving that same book again, on this device or another, does not use another download. Removing a file from a device does not give the download back.</Text>
        <Text style={styles.body}>A new account can save 5 books in a month. Verifying the email raises that to 10. The count resets each month.</Text>
        <Text style={styles.body}>
          The <Text accessibilityRole="link" onPress={() => router.push("/privacy" as unknown as Href)} style={styles.inline}>Privacy Policy</Text> explains what the account stores.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 16, paddingBottom: 48, gap: 16 },
  title: { fontFamily: font.title, fontSize: 28, lineHeight: 36, color: colors.ink },
  body: { fontFamily: font.sans, fontSize: 16, lineHeight: 24, color: colors.ink },
  back: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.atext, minHeight: 44 },
  inline: { fontFamily: font.medium, color: colors.atext, textDecorationLine: "underline" },
});
