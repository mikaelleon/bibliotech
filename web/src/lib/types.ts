/** Who is looking at the app. `none` has no cookie and is sent to Log in. */
export type Session =
  | { kind: "none" }
  | { kind: "guest" }
  | {
      kind: "user";
      name: string;
      email: string;
      role: "user" | "admin";
      downloadsUsed: number;
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
  /** Full synopsis used on desktop detail. */
  summary: string;
  /** Shorter synopsis used under 768px when the mobile frame uses different copy. */
  summaryShort?: string;
  coverUrl?: string;
};
