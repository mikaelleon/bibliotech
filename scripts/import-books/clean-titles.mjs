import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { cleanTitle } from "./lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const file = path.join(root, "web", ".env.local");
for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Missing Supabase URL or secret key");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase.from("books").select("id,title");
if (error) throw new Error(error.message);

const dirty = (data ?? []).filter((row) => cleanTitle(row.title) !== row.title);
let updated = 0;
for (const row of dirty) {
  const title = cleanTitle(row.title);
  const saved = await supabase.from("books").update({ title }).eq("id", row.id);
  if (saved.error) throw new Error(saved.error.message);
  updated += 1;
  console.log(`updated: ${title.slice(0, 80)}`);
}
console.log(`checked ${data?.length ?? 0}, updated ${updated}`);
