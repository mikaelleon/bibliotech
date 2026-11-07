import { MailCheck } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { colors, font, radius } from "@/theme/tokens";

/**
 * Quiet inline notice for unverified accounts. The link opens the web verify page in the
 * phone's browser; the session refreshes when the app returns to the foreground.
 */
export function VerifyEmailBanner() {
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (session.kind !== "user" || session.role === "admin" || session.verified) return null;

  async function send() {
    setBusy(true);
    const result = await api<{ message: string }>("/api/auth/send-verification", { method: "POST" });
    setBusy(false);
    setMessage(result.ok ? result.data.message : result.message);
  }

  return (
    <View style={styles.banner} accessibilityRole="summary">
      <MailCheck color={colors.ink} size={20} strokeWidth={1.5} />
      <View style={styles.body}>
        <Text style={styles.title}>Verify your email to raise your limit from 5 to 10 downloads a month</Text>
        <Text style={styles.note}>We&apos;ll send a link to {session.email}.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => void send()}
          style={styles.action}
        >
          <Text style={styles.actionText}>{busy ? "Sending…" : "Send link"}</Text>
        </Pressable>
        {message ? (
          <Text accessibilityRole="alert" style={styles.note}>
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  body: { flex: 1, gap: 4 },
  title: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  note: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  action: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  actionText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.atext, textDecorationLine: "underline" },
});
