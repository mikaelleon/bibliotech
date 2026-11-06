import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Session is read on every screen. Cache Components would force a Suspense
  // boundary around every cookie read, so this app stays dynamic instead.
  turbopack: {
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
