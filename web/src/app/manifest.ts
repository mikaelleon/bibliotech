import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "E-Library AI",
    short_name: "E-Library",
    description: "Read books you have downloaded, even offline.",
    start_url: "/browse",
    display: "standalone",
    background_color: "#f6f1e7",
    theme_color: "#1f2330",
  };
}
