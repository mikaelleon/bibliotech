/** Light is the shipped theme. Dark values are here for a later toggle. Matches design/tokens.md. */
export const light = {
  bg: "#F6F6F5",
  surface: "#FFFFFF",
  ink: "#1F2330",
  muted: "#63646B",
  line: "#E4E4E2",
  primary: "#20232F",
  primaryHover: "#343848",
  onPrimary: "#FFFFFF",
  accent: "#E2504F",
  atext: "#C23B3E",
  coverShadow: "rgba(31,35,48,0.2)",
  overlay: "rgba(31,35,48,0.2)",
  scrim: "rgba(31,35,48,0.3)",
};

export const dark = {
  bg: "#14161D",
  surface: "#1C1F28",
  ink: "#ECECEA",
  muted: "#A3A3A0",
  line: "#2E313C",
  primary: "#ECECEA",
  primaryHover: "#FFFFFF",
  onPrimary: "#14161D",
  accent: "#E2504F",
  atext: "#F0807F",
  coverShadow: "rgba(0,0,0,0.5)",
  overlay: "rgba(0,0,0,0.6)",
  scrim: "rgba(0,0,0,0.6)",
};

export const colors = light;

export const space = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  24: 24,
  32: 32,
  48: 48,
  64: 64,
} as const;

export const radius = {
  pill: 999,
  panel: 12,
  cover: 4,
} as const;

export const font = {
  sans: "Inter_400Regular",
  medium: "Inter_500Medium",
  /** Page titles. */
  title: "Inter_600SemiBold",
  /** Books only: cover titles, the book detail title, and the wordmark. */
  serif: "Newsreader_400Regular",
} as const;
