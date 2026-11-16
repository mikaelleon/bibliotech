# Landing page, design log

Started 15 November 2026. Scope: the public landing page at `/` (`web/src/app/page.tsx`), light and dark, every width.

## Brief

Bibliotech is a free library of public-domain books (242 in the live catalog, 241 with a file). People arrive to find a book, read it, or download it to keep. Guests get 5 downloads a month, a verified account 10. The feeling: a quiet reading room where the books speak first.

## Obvious choice, named so we can go past it

Centered hero, "Free public-domain books", search under it, three feature cards, a row of covers. That is the last landing page in the repo before this pass and it is what every library site ships.

## Directions (rendered: `proto/directions.html`, capture in `shots/directions/`)

| | Idea | What the render showed |
|---|---|---|
| D1 First lines | Each book greets you with its own opening sentence, set huge in the book face. The shelf is the selector. | The strongest still: "Call me Ishmael." at 156px is an image by itself. Bug in the prototype (kicker overlaps the line) and the shelf covered only 40% of the width. Both are layout problems, not idea problems. |
| D2 The shelf answers | The catalog is the hero. Typing lifts matching spines. | Reads as a bar chart. Dimmed spines look disabled. The headline is the generic one. The behaviour is good, but it only works on the 14 books on screen while search covers 242, so the page would promise more than it does. |
| D3 Card catalog | A drawer of index cards with ruled lines and a coral margin. | An illustration at rest. Needs a paper color and a typewriter face the system does not have. Legibility is worse than D1 at every size. Dropped. |

## Choice

D1, with D2's physical shelf as its control.

- It is the only direction where the content is the design. The line is real text from the book, so the page shows what the product holds.
- It survives every state: the line changes, the spine rises, the line is selectable and the same words appear in the reader.
- The shelf is a tablist, so keyboard and screen reader behaviour comes from a known pattern, not from custom code.
- D2's filter was rejected for honesty. The shelf holds 16 books and search covers 242, so search stays a real search (with the live suggestions already built) and the shelf only does one job.

The concept sentence, which every later decision is checked against: **a book introduces itself in its own words.** It rules out: marketing copy as the hero, illustrations of books, anything that moves without a reason.

## Source of the lines

Each line is the first sentence of the Project Gutenberg text of the book, copied verbatim from the plain-text file of the ebook linked in the catalog (`source_url`), checked with `grep` against the downloaded file on 15 November 2026. One line is cut at a clause and marked with an ellipsis (A Tale of Two Cities). Nothing is invented. Spelling and punctuation follow the source, including `Tzŭ` and the curly quotes.

## System

Found, not invented: `design/tokens.md` and `web/src/app/globals.css` (colors, Inter, 4px space, motion tokens, radius, shadow). Everything new is built from those.

Two proposals to the system, both small:

1. **Newsreader loads the `opsz` axis and the `latin-ext` subset.** Optical sizing gives a display cut at 100px+ and a sturdier cut on small covers. `latin-ext` is needed for `ŭ`. The rule "Newsreader is for books only" becomes "for books and book text". The hero line is book text.
2. **A book-line scale** for the hero, used nowhere else: xl 160/166, l 104/108, m 76/80, s 60/64, chosen by length so a line always fills the stage the same way. Size is `clamp()` on both viewport width and height so a short laptop still sees the shelf.

Rules kept: no negative letter-spacing, no gradients, one accent (the coral dot in the wordmark and links), covers keep their palette. The spine uses the same tick mark the covers draw at the top.

## Assets

No generated imagery. The picture on this page is the catalog: spines are colored with `coverColors(id)`, the same function that colors covers, and the words are the books' own. Generated people, libraries or lamps would be the stock look the brief rules out. The only generation key in the repo is the product's own Gemini key for the assistant, and spending it on decoration is not worth it. Model and date: not applicable.

## Round 1 (fresh critic, 15 November 2026)

Calibration: recent culture sites of the day (Aardvark Book Club, Mosby's Files, PP Neue Montreal) carry one concept through the whole site and its transitions. This page carried it through one screen.

| Criterion | Score | Evidence |
|---|---|---|
| Design (40%) | 7 | Careful display type and a stable stage, but a 191px dead band on the first screen, flat swatch spines, and a stock list, cards and table under the fold. |
| Usability (30%) | 7 | Real tablist, focus ring, reduced motion. Docked for auto-advance with no pause, an unstated shelf affordance, "5 books a month" wording. |
| Creativity (20%) | 7.5 | Apt and not a template; ends at the fold. |
| Content (10%) | 6.5 | Verbatim lines are the best asset. "Popular in Science" was a hard-coded leftover, no footer, assistant unexplained. |
| **Weighted** | **7.05** | Below an Honorable Mention. |

Most wrong note: the seam at y of about 900, where one book's sentence at 148px gives way to a 16px category table and a leftover Science row.

Fixes, biggest first (structure, then behavior, then looks):

1. The idea now runs down the page: the leftover Science row is gone, shelves are set with a real opening line each, there is a footer, About says "downloads".
2. The hero is wider and its sizes follow the stage, so the dead band shrinks; display words are set tighter.
3. Auto-advance has a visible Pause, runs three changes at most, and holds while the pointer is in the hero.
4. The chosen spine lifts further and its tick turns the accent color. Spines get a soft edge instead of a flat block.
5. The Open button no longer disappears on change; only its text swaps. The search field enters with the rest.
6. A real social card with the wordmark.

## Round 2 result

All six fixes above are in. One thing the critic asked for was deliberately not done: a shared-element move from the spine into the book page. The app already has a card-to-cover view transition for its own covers, and wiring a spine into it is a separate piece of work. Also not done: a second critic. One round is the default, so a fresh score is the user's call.

## Round 3: bug report with a screenshot (15 November 2026)

A screenshot of Little Women chosen on the shelf showed every word of the sentence piled on the next one, and the whole line pushed about 60px past the left edge.

Cause: an opening quotation mark hangs in the margin with `text-indent: -0.4em` on the line. `text-indent` is inherited, and every word is an inline-block, which starts its own first line. Each word pulled itself 0.4em to the left. Nothing caught it because the sweeps so far never chose that book (the only line that starts with a quotation mark).

Fix: `.fl-w { text-indent: 0 }`, so only the first line of the sentence hangs.

Why it was missed, and what now catches it: `sweep.mjs` in this folder chooses every spine at nine viewports (1920x1080, 1440x900, 1400x825 at 1.25x as in the report, 1366x768, 1280x720, 1024x768, 768x1024, 390x844, 360x740), waits for the line to settle, and measures: words overlapping on one line, the line outside the text edge (allowing the hang), the line meeting the heading or the row, the page scrolling sideways, the shelf below the fold, console errors. 144 states, no problems after the fix. Contact sheets are in `shots/sweep/`.

Also changed in this round, from the sweep and the open list:

- The hero is no longer stretched to fill the screen. It is at most 700px tall, and on a screen under 800px tall it ends where its content ends. The empty space above a one-line sentence went from about 160px to about 55 to 80px at every size measured (box to box, sub line to first line), and the next section starts at or just past the fold, so it invites a scroll.
- Short laptops get larger lines (the size limit by height was too tight once the hero stopped filling the screen).
- Search suggestions show the short title ("Jane Eyre", "A Christmas Carol in Prose"). Two results that would read the same keep their full titles, so the two Moby-Dick editions stay apart. `shortTitle` is in `lib/title.ts`.

Not changed: spine colors still repeat because they are the cover colors.

## Round 4: polish pass (15 November 2026)

Score before: 7.5 (every state designed, motion correct, one thing worth a screenshot, not yet held in every state). Weakest thing named: the 148px display line was set at default tracking, so "Call me Ishmael." read airy next to a real display cut.

Changes, one reason each:

- Display tracking: -0.022em at the two largest sizes, -0.012em and -0.008em below, word space -0.03em (was -0.05em with no tracking). Large type wants tighter. Recorded in `design/tokens.md` as the one exception to "no negative tracking".
- Spines on a phone are at least 44px wide (the narrowest were 38px).
- Pause hover is gated to `(hover: hover)`.

Checked and left alone: contrast (muted text 5.4:1), tabular numbers on counts, layout shift when Pause disappears (the row has a fixed height), stacking (search suggestions sit above the shelf), focus ring (inset, neutral), press and hover timings, reduced motion. `sweep.mjs` over all 16 lines at six sizes: no problems.

## Open issues

- Spine colors repeat (Moby-Dick sits beside The Yellow Wallpaper, both forest green). The raised spine, the lift and the coral tick carry the choice.
- Search field and Log in borders are about 1.2:1 against the page. That is the app's border token, not changed here.
- No shared-element transition from a spine into the book page.
- Newsreader is a 132 KB variable file now (was a 400-only file).
- Not tested on a real phone, in landscape, or at 2560 wide.
- `next build` was not run because the dev server shares the `.next` folder.
- The load-trigger capture sometimes logs a hydration warning right after a file edit. It did not appear in the browser pane, in plain captures or in the sweep (which also reads console errors), so it is treated as dev-server noise, not confirmed.
