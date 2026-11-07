import { useGlobalSearchParams, useRouter, type Href } from "expo-router";
import { Download } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FadeIn } from "@/components/FadeIn";
import { SearchBar } from "@/components/SearchBar";
import { leftLabel, quotaFor, type Quota } from "@/lib/quota";
import { useSession } from "@/lib/session";
import { colors, font } from "@/theme/tokens";

export function ShellHeader() {
  const router = useRouter();
  const params = useGlobalSearchParams<{ q?: string; category?: string }>();
  const { session } = useSession();
  const query = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "";
  const [text, setText] = useState(query);
  const [seenQuery, setSeenQuery] = useState(query);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const quota = quotaFor(session);
  if (seenQuery !== query) {
    setSeenQuery(query);
    setText(query);
  }

  function submit() {
    const next = text.trim();
    router.push({
      pathname: "/search",
      params: {
        ...(next ? { q: next } : {}),
        ...(category ? { category } : {}),
      },
    } as unknown as Href);
  }

  return (
    <View style={styles.wrap}>
    <View style={[styles.bar, session.kind === "guest" && styles.guestGap]}>
      <SearchBar value={text} onChangeText={setText} onSubmit={submit} />
      {session.kind === "user" ? (
        <View style={styles.side}>
          {quota ? <QuotaButton quota={quota} open={quotaOpen} onPress={() => setQuotaOpen((v) => !v)} /> : null}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${session.name} account`}
            onPress={() => router.push("/profile")}
            style={styles.avatar}
          >
            <Text style={styles.initial}>{session.name.slice(0, 1).toUpperCase()}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.side}>
          {quota ? <QuotaButton quota={quota} open={quotaOpen} onPress={() => setQuotaOpen((v) => !v)} /> : null}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Register"
            onPress={() => router.push("/register")}
            style={styles.register}
          >
            <Text style={styles.registerLabel}>Register</Text>
          </Pressable>
        </View>
      )}
    </View>
    {quota && quotaOpen ? (
      <QuotaPanel
        quota={quota}
        onRegister={() => {
          setQuotaOpen(false);
          router.push("/register");
        }}
      />
    ) : null}
    </View>
  );
}

/** "5 left" beside a download icon. The icon names the unit; the label reads the whole sentence. */
function QuotaButton({ quota, open, onPress }: { quota: Quota; open: boolean; onPress: () => void }) {
  const color = quota.low ? colors.atext : colors.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${quota.left} of ${quota.limit} downloads left. ${open ? "Hide" : "Show"} details`}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={[styles.quotaButton, open && styles.quotaOpen]}
    >
      <Download color={color} size={16} strokeWidth={1.5} />
      <Text style={[styles.quota, { color }]}>{quota.left === 0 ? "None left" : `${quota.left} left`}</Text>
    </Pressable>
  );
}

/** Opens under the header and pushes the page down, so nothing is covered. */
function QuotaPanel({ quota, onRegister }: { quota: Quota; onRegister: () => void }) {
  const width = `${(quota.used / quota.limit) * 100}%` as const;
  return (
    <FadeIn style={styles.panel}>
      <Text style={styles.panelTitle}>
        {quota.guest ? `Guests can download ${quota.limit} books` : `${quota.used} of ${quota.limit} downloads used · ${leftLabel(quota.left)}`}
      </Text>
      <View accessibilityElementsHidden style={styles.track}>
        <View style={[styles.fill, { width }]} />
      </View>
      <Text style={styles.panelBody}>
        {quota.guest
          ? "A free account raises the limit to 10 and keeps a library and favorites."
          : quota.left === 0
            ? "You've reached your limit."
            : `Registered accounts include ${quota.limit} downloads.`}
      </Text>
      <Text style={styles.panelNote}>Downloading opens in a later update.</Text>
      {quota.guest ? (
        <Text accessibilityRole="link" onPress={onRegister} style={styles.panelLink}>
          Register for 10 downloads
        </Text>
      ) : null}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
  },
  quotaButton: {
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quotaOpen: {
    backgroundColor: colors.bg,
  },
  panel: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  panelTitle: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  track: {
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  fill: {
    height: 4,
    backgroundColor: colors.accent,
  },
  panelBody: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  panelNote: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  panelLink: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.atext,
    textDecorationLine: "underline",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  guestGap: {
    gap: 8,
  },
  side: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quota: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onPrimary,
  },
  register: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  registerLabel: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
});
