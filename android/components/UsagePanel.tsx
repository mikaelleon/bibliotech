import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { supabase } from "@/lib/supabase";
import { colors, font, radius } from "@/theme/tokens";

/** Same shape as the web UsagePanel and my_ai_quota(). */
export type AiUsage = {
  tier: string;
  usedToday: number;
  limitToday: number;
  usedMonth: number;
  limitMonth: number;
  resetsDailyAt: string;
  resetsMonthlyAt: string;
};

export type DownloadUsage = { used: number; limit: number; resetsAt: string | null };

function percentOf(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function timeText(iso: string | null, kind: "daily" | "date"): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  if (kind === "date") return `Resets ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return date.toDateString() === new Date().toDateString() ? `Resets at ${time}` : `Resets tomorrow at ${time}`;
}

/** The reader's own assistant usage, read straight from Supabase so it works without the web server. */
export function useAiUsage(enabled: boolean): AiUsage | null {
  const [ai, setAi] = useState<AiUsage | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    supabase.rpc("my_ai_quota").then(({ data, error }) => {
      if (live && !error) setAi((data as AiUsage | null) ?? null);
    });
    return () => {
      live = false;
    };
  }, [enabled]);
  return ai;
}

function Row({
  label,
  detail,
  reset,
  used,
  limit,
  first,
}: {
  label: string;
  detail: string;
  reset: string | null;
  used: number;
  limit: number;
  first?: boolean;
}) {
  const percent = percentOf(used, limit);
  return (
    <View style={[styles.row, first && styles.rowFirst]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowDetail}>
        {detail}
        {reset ? ` · ${reset}` : ""}
      </Text>
      <View style={styles.meter}>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: limit, now: Math.min(used, limit), text: `${used} of ${limit} used` }}
          style={styles.track}
        >
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.percent}>{percent}% used</Text>
      </View>
    </View>
  );
}

/** Profile: how much of each allowance is used and when it resets. Mirrors web usage-panel.tsx. */
export function UsagePanel({
  verified,
  ai,
  downloads,
}: {
  verified: boolean;
  ai: AiUsage | null;
  downloads: DownloadUsage;
}) {
  const router = useRouter();
  const todayPercent = ai ? percentOf(ai.usedToday, ai.limitToday) : 0;
  const headline = !ai
    ? "Usage for the assistant isn't available right now."
    : todayPercent >= 100
      ? "Daily limit reached."
      : todayPercent === 0
        ? "Fresh day. Nothing used yet."
        : `${todayPercent}% of your daily assistant limit used.`;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>
          Your usage
        </Text>
        <Text style={styles.status}>{verified ? "Verified" : "Email not verified"}</Text>
      </View>
      <Text style={styles.headline}>{headline}</Text>
      <View style={styles.rows}>
        {ai ? (
          <>
            <Row
              first
              label="Assistant today"
              detail={`${ai.usedToday} of ${ai.limitToday} questions`}
              reset={timeText(ai.resetsDailyAt, "daily")}
              used={ai.usedToday}
              limit={ai.limitToday}
            />
            <Row
              label="Assistant this month"
              detail={`${ai.usedMonth} of ${ai.limitMonth} questions`}
              reset={timeText(ai.resetsMonthlyAt, "date")}
              used={ai.usedMonth}
              limit={ai.limitMonth}
            />
          </>
        ) : null}
        <Row
          first={!ai}
          label="Downloads this month"
          detail={`${downloads.used} of ${downloads.limit} books`}
          reset={timeText(downloads.resetsAt, "date")}
          used={downloads.used}
          limit={downloads.limit}
        />
      </View>
      {!verified ? (
        <Text style={styles.note}>
          Verify your email to raise the limits: 20 assistant questions a day instead of 5, 10 downloads a month instead of 5,
          and saved chats.
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push("/downloads" as Href)}
        style={styles.link}
      >
        <Text style={styles.linkText}>View download history</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.panel, padding: 24 },
  head: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: 12 },
  title: { fontFamily: font.medium, fontSize: 20, lineHeight: 28, color: colors.ink },
  status: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  headline: { marginTop: 16, fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  rows: { marginTop: 8 },
  row: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.line },
  rowFirst: { paddingTop: 16 },
  rowLabel: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  rowDetail: { fontFamily: font.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
  meter: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 16 },
  track: { flex: 1, height: 8, borderRadius: 999, backgroundColor: colors.line, overflow: "hidden" },
  fill: { height: 8, backgroundColor: colors.accent },
  percent: {
    // Fixed, not min: "30% used" is wider than "5% used" and would shorten its own bar.
    width: 72,
    textAlign: "right",
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  note: { marginTop: 16, fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  link: { marginTop: 0, minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  linkText: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.atext, textDecorationLine: "underline" },
});
