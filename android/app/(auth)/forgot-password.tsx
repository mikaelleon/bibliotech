import { useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Wordmark } from "@/components/Wordmark";
import { colors, font } from "@/theme/tokens";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function send(address: string) {
    if (!emailPattern.test(address)) {
      setError("Enter a valid email, like name@example.com.");
      return;
    }
    setError("");
    setSent(address);
    setCooldown(30);
  }

  let body: ReactNode;
  if (sent) {
    body = (
      <>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.lede}>If an account exists for {sent}, a reset link is on its way.</Text>
        {cooldown > 0 ? (
          <Text style={styles.lede}>Resend email in {cooldown}s</Text>
        ) : (
          <Pressable accessibilityRole="link" onPress={() => send(sent)}>
            <Text style={styles.link}>Resend email</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="link" onPress={() => router.push("/login")}>
          <Text style={styles.link}>Back to Login</Text>
        </Pressable>
      </>
    );
  } else {
    body = (
      <>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.lede}>{"Enter the email on your account. You'll get the same message either way."}</Text>
        <View style={styles.form}>
          <Field label="Email" value={email} onChangeText={setEmail} email error={error} />
          <Button label="Send reset link" full onPress={() => send(email.trim())} />
          <Pressable accessibilityRole="link" onPress={() => router.push("/login")}>
            <Text style={styles.link}>Back to Login</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Wordmark />
          {body}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  title: {
    marginTop: 32,
    fontFamily: font.title,
    fontSize: 28,
    lineHeight: 36,
    color: colors.ink,
  },
  lede: {
    marginTop: 8,
    fontFamily: font.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
  form: { marginTop: 24, gap: 16 },
  link: {
    marginTop: 16,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.atext,
    textDecorationLine: "underline",
  },
});
