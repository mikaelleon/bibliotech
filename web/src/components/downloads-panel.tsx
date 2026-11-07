import { quotaFor, quotaNote, resetLabel } from "@/lib/quota";
import type { Session } from "@/lib/types";

/** Profile: tier, verified state, used of limit and the reset date. */
export function DownloadsPanel({ session }: { session: Extract<Session, { kind: "user" }> }) {
  const quota = quotaFor(session);
  if (!quota) return null;
  const reset = resetLabel(quota.resetsAt);
  const percent = quota.limit ? `${(quota.used / quota.limit) * 100}%` : "0%";

  return (
    <section className="rounded-xl bg-card p-8" aria-labelledby="downloads-heading">
      <h2 id="downloads-heading" className="text-xl leading-7 font-medium">
        Downloads
      </h2>
      <dl className="mt-4 grid gap-3 text-sm leading-5">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Account</dt>
          <dd>{session.verified ? "Verified" : "Guest, email not verified"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">This month</dt>
          <dd>
            {quota.used} of {quota.limit} used
          </dd>
        </div>
        {reset ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Resets on</dt>
            <dd>{reset}</dd>
          </div>
        ) : null}
      </dl>
      <div
        className="mt-4 h-1 overflow-hidden rounded-full bg-border"
        role="meter"
        aria-label="Downloads used this month"
        aria-valuemin={0}
        aria-valuemax={quota.limit}
        aria-valuenow={quota.used}
      >
        <i className="bar-grow block h-full bg-brand" style={{ width: percent }} />
      </div>
      <p className="mt-3 text-sm leading-5 text-muted-foreground">{quotaNote(quota)}</p>
    </section>
  );
}
