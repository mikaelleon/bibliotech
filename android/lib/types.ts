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
  summary: string;
  summaryShort?: string;
  coverUrl?: string;
};
