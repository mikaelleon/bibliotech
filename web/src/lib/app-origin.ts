import "server-only";

import { headers } from "next/headers";

/** Origin for links in emails. Never taken from the Host header in production (link poisoning). */
export async function appOrigin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") throw new Error("APP_URL is not set.");
  const list = await headers();
  return `${list.get("x-forwarded-proto") ?? "http"}://${list.get("host") ?? "localhost:3000"}`;
}
