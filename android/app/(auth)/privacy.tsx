import { useRouter, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, font } from "@/theme/tokens";

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.body}>The account stores the display name, email, library, favorites, reading place, and download history. Download history records when a book was first saved, when it was last saved, and the device label, such as Web or Android.</Text>
        <Text style={styles.body}>That record runs the library and the monthly download limit. It is not sold.</Text>
        <Text style={styles.body}>
          Creating an account means you agree to these terms. The <Text accessibilityRole="link" onPress={() => router.push("/terms" as unknown as Href)} style={styles.inline}>Terms and Conditions</Text> cover the download limit.
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
