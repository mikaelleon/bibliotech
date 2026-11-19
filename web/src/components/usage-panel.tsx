"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

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

/** Times are shown in the reader's own timezone, so they are formatted after the page loads. */
function timeText(iso: string | null, kind: "daily" | "date"): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  if (kind === "date") return `Resets ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return date.toDateString() === new Date().toDateString() ? `Resets at ${time}` : `Resets tomorrow at ${time}`;
}

function Row({
  label,
  detail,
  reset,
  used,
  limit,
}: {
  label: string;
  detail: string;
  reset: string | null;
  used: number;
  limit: number;
}) {
  const percent = percentOf(used, limit);
  return (
    <div className="grid gap-x-6 gap-y-2 py-4 md:grid-cols-[minmax(0,10rem)_1fr_4.5rem] md:items-center">
      <div>
        <p className="text-sm leading-5 font-medium">{label}</p>
        <p className="text-xs leading-4 text-muted-foreground">
          {detail}
          {reset ? ` · ${reset}` : ""}
        </p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-border"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
        aria-valuetext={`${used} of ${limit} used`}
      >
        <i className="bar-grow block h-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm leading-5 text-muted-foreground md:text-right">{percent}% used</p>
    </div>
  );
}

/**
 * Profile: how much of each allowance is used and when it resets. Assistant questions reset daily
 * and monthly (UTC day and month, shown in local time). Downloads reset on the account's monthly
 * period. Admins don't use either, so the page doesn't show this to them.
 */
export function UsagePanel({
  verified,
  ai,
  downloads,
}: {
  verified: boolean;
  ai: AiUsage | null;
  downloads: DownloadUsage;
}) {
  // False on the server and during hydration, true afterwards: local times appear without a mismatch.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const when = (iso: string | null, kind: "daily" | "date") => (mounted ? timeText(iso, kind) : null);

  const todayPercent = ai ? percentOf(ai.usedToday, ai.limitToday) : 0;
  const headline = !ai
    ? "Usage for the assistant isn't available right now."
    : todayPercent >= 100
      ? "Daily limit reached."
      : todayPercent === 0
        ? "Fresh day. Nothing used yet."
        : `${todayPercent}% of your daily assistant limit used.`;

  return (
    <section className="rounded-xl bg-card p-8" aria-labelledby="usage-heading">
      <div className="flex items-baseline gap-3">
        <h2 id="usage-heading" className="text-xl leading-7 font-medium">
          Your usage
        </h2>
        <span className="text-sm leading-5 text-muted-foreground">{verified ? "Verified" : "Email not verified"}</span>
      </div>
      <p className="mt-4 text-sm leading-5 font-medium">{headline}</p>

      <div className="mt-2 divide-y divide-border border-t border-border">
        {ai ? (
          <>
            <Row
              label="Assistant today"
              detail={`${ai.usedToday} of ${ai.limitToday} questions`}
              reset={when(ai.resetsDailyAt, "daily")}
              used={ai.usedToday}
              limit={ai.limitToday}
            />
            <Row
              label="Assistant this month"
              detail={`${ai.usedMonth} of ${ai.limitMonth} questions`}
              reset={when(ai.resetsMonthlyAt, "date")}
              used={ai.usedMonth}
              limit={ai.limitMonth}
            />
          </>
        ) : null}
        <Row
          label="Downloads this month"
          detail={`${downloads.used} of ${downloads.limit} books`}
          reset={when(downloads.resetsAt, "date")}
          used={downloads.used}
          limit={downloads.limit}
        />
      </div>

      {!verified ? (
        <p className="mt-4 text-sm leading-5 text-muted-foreground">
          Verify your email to raise the limits: 20 assistant questions a day instead of 5, 10 downloads a month instead of 5,
          and saved chats.
        </p>
      ) : null}
      <Link href="/downloads" className="mt-4 inline-flex min-h-11 items-center text-sm leading-5 text-brand-text underline">
        View download history
      </Link>
    </section>
  );
}
