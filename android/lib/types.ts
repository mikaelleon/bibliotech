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
  "Technology",
  "Science",
  "Business",
  "Education",
  "Fiction",
  "History",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Book = {
  id: string;
  title: string;
  author: string;
  category: Category;
  language: string;
  license: string;
  sourceName: string;
  sourceUrl: string;
  summary: string;
  summaryShort?: string;
  coverUrl?: string;
};
