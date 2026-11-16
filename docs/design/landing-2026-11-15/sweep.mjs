// Selects every spine on the landing shelf at several viewports and checks the line for overlap,
// overflow and collisions. Writes one PNG per state and one contact sheet per viewport.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SKILL = "C:/Users/keoch/.claude/skills/charles-unreasonable-craft/scripts";
const { launchChrome, contactSheet } = await import(pathToFileURL(path.join(SKILL, "lib.mjs")).href);

const out = process.argv[2];
const url = process.argv[3] ?? "http://localhost:3000";
const only = process.argv[4] ? process.argv[4].split(",") : null;
fs.mkdirSync(out, { recursive: true });

const viewports = [
  { name: "1920x1080", width: 1920, height: 1080, dpr: 1 },
  { name: "1440x900", width: 1440, height: 900, dpr: 1 },
  { name: "1400x825", width: 1400, height: 825, dpr: 1.25 },
  { name: "1366x768", width: 1366, height: 768, dpr: 1 },
  { name: "1280x720", width: 1280, height: 720, dpr: 1 },
  { name: "1024x768", width: 1024, height: 768, dpr: 1 },
  { name: "768x1024", width: 768, height: 1024, dpr: 1 },
  { name: "390x844", width: 390, height: 844, dpr: 2 },
  { name: "360x740", width: 360, height: 740, dpr: 2 },
].filter((v) => !only || only.includes(v.name));

const browser = await launchChrome();
const problems = [];

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dpr,
    colorScheme: "light",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 160));
  });
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const count = await page.locator(".fl-spine").count();
  const tiles = [];

  for (let i = 0; i < count; i++) {
    await page.evaluate((index) => {
      const spines = document.querySelectorAll(".fl-spine");
      spines[index].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
      spines[index].click();
    }, i);
    await page.waitForTimeout(1700);

    const report = await page.evaluate(() => {
      const issues = [];
      const line = document.querySelector('.fl-line[data-state="active"]');
      const stage = document.querySelector(".fl-stage");
      const row = document.querySelector(".fl-row");
      const shelf = document.querySelector(".fl-shelf");
      const head = document.querySelector(".fl-h1");
      if (!line || !stage || !row || !shelf) return { issues: ["missing nodes"], text: "" };
      const words = [...line.querySelectorAll(".fl-w")].map((w) => w.getBoundingClientRect());
      const fontSize = parseFloat(getComputedStyle(line).fontSize);
      // words on one visual line must not overlap
      const rows = [];
      for (const r of words) {
        const hit = rows.find((g) => Math.abs(g.top - r.top) < r.height * 0.4);
        if (hit) hit.items.push(r);
        else rows.push({ top: r.top, items: [r] });
      }
      for (const g of rows) {
        g.items.sort((a, b) => a.left - b.left);
        for (let k = 1; k < g.items.length; k++) {
          if (g.items[k].left < g.items[k - 1].right - 0.5) issues.push(`words overlap by ${(g.items[k - 1].right - g.items[k].left).toFixed(1)}px`);
        }
      }
      const s = stage.getBoundingClientRect();
      const left = Math.min(...words.map((w) => w.left));
      const right = Math.max(...words.map((w) => w.right));
      const top = Math.min(...words.map((w) => w.top));
      const bottom = Math.max(...words.map((w) => w.bottom));
      if (left < s.left - fontSize * 0.45) issues.push(`line starts ${(s.left - left).toFixed(0)}px left of the text edge`);
      if (right > s.right + 2) issues.push(`line runs ${(right - s.right).toFixed(0)}px past the right edge`);
      const r = row.getBoundingClientRect();
      if (bottom > r.top + 4) issues.push(`line bottom ${bottom.toFixed(0)} overlaps the row at ${r.top.toFixed(0)}`);
      const h = head.getBoundingClientRect();
      if (top < h.bottom + 4) issues.push(`line top ${top.toFixed(0)} touches the heading at ${h.bottom.toFixed(0)}`);
      const sh = shelf.getBoundingClientRect();
      const doc = document.documentElement;
      if (doc.scrollWidth > doc.clientWidth + 1) issues.push(`page scrolls sideways by ${doc.scrollWidth - doc.clientWidth}px`);
      const sub = document.querySelector(".fl-sub").getBoundingClientRect();
      const hero = document.querySelector(".fl").getBoundingClientRect();
      const next = document.querySelector("main > section:not(.fl)");
      return {
        issues,
        gap: Math.round(top - sub.bottom),
        heroBottom: Math.round(hero.bottom),
        nextTop: next ? Math.round(next.getBoundingClientRect().top) : 0,
        text: line.textContent.slice(0, 28),
        size: Math.round(fontSize),
        lines: rows.length,
        shelfBottom: Math.round(sh.bottom),
        vh: window.innerHeight,
      };
    });

    const file = path.join(out, `${vp.name}-${String(i).padStart(2, "0")}.png`);
    const clipH = Math.min(vp.height, report.shelfBottom ? report.shelfBottom + 12 : vp.height);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: vp.width, height: clipH } });
    tiles.push({ input: file, label: `${i} ${report.text} ${report.size}px x${report.lines}` });
    (globalThis.gaps ??= {})[vp.name] ??= [];
    globalThis.gaps[vp.name].push({ i, gap: report.gap, heroBottom: report.heroBottom, nextTop: report.nextTop });
    if (vp.width >= 768 && report.shelfBottom > report.vh) report.issues.push(`shelf bottom ${report.shelfBottom} is below the fold ${report.vh}`);
    for (const issue of report.issues) problems.push(`${vp.name} #${i} ${report.text}: ${issue}`);
  }
  if (errors.length) problems.push(`${vp.name}: console ${[...new Set(errors)].join(" | ")}`);
  const g = globalThis.gaps[vp.name];
  console.log(`${vp.name}: gap above line: Moby ${g[12].gap}px, min ${Math.min(...g.map((x) => x.gap))}, max ${Math.max(...g.map((x) => x.gap))}; hero bottom ${g[12].heroBottom}, next section top ${g[12].nextTop} (viewport ${vp.height})`);
  await contactSheet(tiles, path.join(out, `${vp.name}-sheet.png`), { cols: vp.width < 768 ? 8 : 4, width: vp.width < 768 ? 170 : 520 });
  await context.close();
  console.log(`${vp.name}: ${count} states done`);
}

await browser.close();
fs.writeFileSync(path.join(out, "problems.txt"), problems.join("\n") || "none");
console.log(problems.length ? `PROBLEMS (${problems.length}):\n${problems.join("\n")}` : "no problems");
