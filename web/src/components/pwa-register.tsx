"use client";

import { useEffect } from "react";

/** Registers the app-shell service worker. Reading progress is flushed from the signed-in shell. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
  }, []);
  return null;
}
