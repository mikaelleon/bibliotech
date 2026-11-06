"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { SearchBar } from "@/components/search-bar";

/** One search field. Placeholder and key hint follow the viewport. */
export function ShellSearch() {
  const params = useSearchParams();
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return <SearchBar key={params.get("q") ?? ""} query={params.get("q") ?? ""} compact={narrow} />;
}
