# Phase 1 deck, design log

Started 19 November 2026. Scope: the five-slide Phase 1 progress deck (Slides artifact, private link kept by the author). Slides follow the panel's rubric: overview, stack, architecture, authentication and interfaces, progress.

## Brief

A progress deck shown live to an instructor panel, graded slide by slide against a fixed rubric, with a live app demo on slide 4. The feeling is the product's own: a quiet reading room where the books speak first.

## Baseline audit (first version, same day)

Rendered at 1920x1080 before changing anything. What was wrong:

- Tracked uppercase coral eyebrow on every slide, three equal cards on slides 1 and 5, a spreadsheet table for the stack. All defaults.
- Slide 5 list text was grey on dark and nearly invisible. The footer read "Phase 1 1" (label and page number ran together).
- Slide 3 had no drawn connections and tiny boxes. Slide 4 was four dashed placeholder boxes.
- Off-system: Newsreader used for headings. The system keeps it for book text only. No wordmark dot.
- Stale and wrong facts: 209 books (live catalog is 242), "Guest" described loosely, a headline that did not mean anything.
- About nine type sizes.

## Obvious choice, named

A dark title, three feature cards, a table for the stack, boxes and arrows with no data in them, and placeholder screenshots. It is what every progress deck ships.

## Directions (rendered side by side, slides 1 and 2 of each)

| | Idea | What the render showed |
|---|---|---|
| A Reading room | Light ground. The catalog is the picture: 242 real spines on a bookcase. The stack is literally a stack of book spines titled with the tools. | Strongest. Slide 1 carries real data as the image. Slide 2 reads at a glance and uses Newsreader exactly where the system allows it (spine titles). Needed to fill the slide's lower third. |
| B After hours | Dark ground, giant "242", three shelves. | Slide 1 is striking and the dark suits spines. Slide 2 was a generic list and overflowed. The numeral outranked the product name. |
| C Volumes | Each slide is a book: a coloured spine band down the left carrying the title. | Elegant, but a thin idea. The band repeats the title and adds no information. Rotated text is fragile in Slides. |

## Choice

A, with B's dark ground for the opener and C's discipline of one running footer. Concept, checked on every slide: **the picture is always the product's own material.** It rules out illustration, stock imagery, invented charts and placeholder screens. Slide 1 is the catalog, slide 2 the stack as book spines, slide 3 the real data path, slide 4 real captures, slide 5 the real git history as a shelf.

## System

Found, not invented: `design/tokens.md`. Colors, radius 12 / 4 / pill, Inter, Newsreader for book text only, the coral dot in the wordmark, the cover palette. No gradients, no shadows beyond a hairline.

Deck mapping: Inter 128 / 44 / 32 / 24 plus Newsreader 40 on spines. A 48x4 coral tick before each title echoes the tick the covers draw. One running footer (wordmark and page number) at the same place on every slide. Dark slides 1 and 4, light slides 2, 3 and 5.

## Assets

No generated imagery. The only generation key in the repo is the product's own Gemini key, and spending it on decoration is not worth it. Everything is made from real material:

- Slide 1: the 242 books of the live catalog, drawn as spines, colored by the same `coverColors(slug)` function the app uses.
- Slide 4: four captures of the running app. Web from the dev server on port 3000 (guest session). Android from the app's Expo web build at 390x844, not an emulator.
- Slide 5: the 43 commits in `git log`, one spine each, grouped by day.

The generator scripts were scratch files and are not in the repo.

## Verification

- Every slide rendered in Chrome at 1920x1080 with the Slides reference CSS, and measured from the DOM: content sits between x 128 and 1792, the four screens on slide 4 share top and bottom edges with equal 45px gaps.
- Motion read frame by frame: slide 1 shelves fill top to bottom at 80ms steps and settle by about 900ms. Slides 2 to 5 stagger the same way. Nothing jumps and the settled frame equals the rest frame.
- Facts checked against the repo on the day: 242 books in the live catalog, 43 commits over 6 days, 19 migrations, typecheck passes in web and Android, Android lint is clean, a guest opening `/admin` gets the no-access panel.
- Not clean: `npm run lint` in `web` reports one error, `react-hooks/set-state-in-effect` at `web/src/lib/use-pending-nav.ts:18`. The deck claims typecheck only.

## Round 1 (fresh critic, 19 November 2026)

Weighted 6.55: Design 6.5, Usability 7, Creativity 6, Content 6.5. Nearest to "wow": slide 1's bookcase filling shelf by shelf, and the 242-spine / 43-spine rhyme between slides 1 and 5.

Fixed after the round: slide 2 spine widths encoded nothing, now equal, and the explanations rewritten as reasons; slide 1 said guests could not download while the screens showed "5 left", now "Guest: browse, search, 5 downloads"; slide 3 caption said the agent sat in both apps (now: chat panel in both, agent on the server) and the SQL arrow now lands on PostgreSQL; the repo link and date span are larger and exact ("7 to 19 Nov").

Not fixed, and what would lift the score: real titles on pulled spines and a Newsreader first line on slide 1; a larger single hero screen on slide 4 with an authenticated state and device frame (needs a signed-in account and an emulator); statement titles instead of rubric labels; slide 5 spines landing in time order with the 9 to 15 Nov gap shown; no bullets.

## Open

- "Guest" on slide 1 follows the Continue as guest button (browse and search). `docs/prompts/phase2-implementation.md` defines Guest as an unverified account with 5 books a month and flags it **[CONFIRM]** with the instructor.
- The Phase 2 plan column comes from the project docs (AI usage view in `docs/ai-assistant.md`, EAS preview profile in `android/eas.json`, Listen with the screen off in `docs/phase2-notes.md`). Replace it with the course's own plan if it differs.
