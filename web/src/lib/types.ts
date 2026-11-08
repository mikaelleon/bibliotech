/**
 * Who is looking at the app. `none` has no account and no visitor cookie and is sent to Log in.
 * `guest` is a visitor without an account ("Continue as guest"). Phase 2 step 2 renames it to
 * visitor when Guest becomes an unverified account.
 */
export type Session =
  | { kind: "none" }
  | { kind: "guest" }
  | {
      kind: "user";
      /** Supabase auth user id (uuid). */
      id: string;
      name: string;
      email: string;
      role: "user" | "admin";
      /** profiles.email_verified_at is set. Unverified accounts are the Guest tier (5), verified are Registered (10). */
      verified: boolean;
      /** New books downloaded in the current monthly period (from my_quota()). */
      downloadsUsed: number;
      /** Books allowed per period for this tier (from quota_limits). 0 for admins. */
      downloadLimit: number;
      /** When the current period ends and the count resets (ISO time), or null if unknown. */
      resetsAt: string | null;
    };

export const CATEGORIES = [
  "Fiction",
  "Classics",
  "Philosophy",
  "History",
  "Science",
  "Technology",
  "Business",
  "Poetry",
  "Children",
  "Education",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Book = {
  /** Address used in URLs. This is `books.slug`. */
  id: string;
  /** `books.id` when the row comes from the database. */
  uuid?: string;
  title: string;
  author: string;
  category: Category;
  language: string;
  /** First publication, as display text (a year, or "c. 400 BC" for ancient works). */
  published?: string;
  license: string;
  sourceName: string;
  sourceUrl: string;
  /** Full synopsis used on desktop detail. */
  summary: string;
  /** Shorter synopsis used under 768px when the mobile frame uses different copy. */
  summaryShort?: string;
  coverUrl?: string;
  /** True when a file sits in the private books bucket. */
  hasFile?: boolean;
  fileSize?: number;
  attribution?: string;
};
