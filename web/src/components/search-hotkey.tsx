"use client";

import { useEffect } from "react";

/** Ctrl K or Cmd K moves focus to the only search field on the page. */
export function SearchHotkey() {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const field = document.getElementById("site-search") ?? document.getElementById("landing-search");
        field?.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
