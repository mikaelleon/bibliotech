import { cleanTitle } from "./lib.mjs";

const samples = [
  "1066 and all that : $b A memorable history of England, comprising all the parts you can remember, including 103 good things, 5 bad kings and 2 genuine dates",
  "Boston : $b a novel",
  "The unknown seven : $b A detective story",
  "Pride and Prejudice",
  "Main currents : $b An interpretation / $c Vernon Parrington",
  "$a Main title : $b Subtitle",
];

for (const sample of samples) {
  const cleaned = cleanTitle(sample);
  if (cleaned.includes("$")) throw new Error(cleaned);
  console.log(cleaned);
}
