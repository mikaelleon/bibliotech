# Prompt: motion, micro-interactions, and empty states

Use this file as the instruction prompt for an agent (or a person) implementing motion and empty states in Bibliotech. Work in `web/` first, then `android/`. Read the whole file before editing.

## 1. Goal

Make the app feel responsive and calm. Motion should explain what changed, where it came from, and where it went. It should never decorate. Empty states should tell the reader what the page is for and give one real next step.

## Progress

Web, done on 7 November 2026 (lint and type-check pass, checked in the browser at 1280px and 375px):

| Task | Where it lives |
|---|---|
| Motion tokens `--dur-move`, `--dur-confirm`, `--dur-reveal` | `web/src/app/globals.css`, `web/src/lib/motion.ts` |
| W1 tooltip motion | `components/ui/tooltip.tsx` (`.tip-pop`) |
| W2 admin row stagger, first render only | `components/data-table.tsx`, `admin/page.tsx` |
| W3 press feedback | rail, tab bar, pagination, row menu, hearts, chips |
| W4 theme knob that slides and stretches | `components/theme-toggle.tsx`, `lib/use-indicator.ts` |
| W5 book detail settles after the cover | `books/[id]/page.tsx` (`--stagger-start: 80ms`) |
| W7 heart pulse, "Saved" / "Updated" on profile buttons | `favorite-button.tsx`, `save-label.tsx` |
| W8 one sliding indicator per nav group | `use-indicator.ts`: side rail, tab bar, category chips, analytics range (`range-tabs.tsx`) |
| W9 dialogs grow from and shrink back to their trigger | `components/dialog.tsx` |
| W10 toast exit, overlapping replacement | `components/toast.tsx` |
| W11 page changes overlap, cover morph | `components/view-transitions.tsx` (mounted in `app/layout.tsx`) |
| W12 theme circle reveal, summary mask reveal | `theme-toggle.tsx`, `book-summary.tsx` |
| W13 icon and label crossfades | `components/swap.tsx`: heart, sun/moon, eye, Log in, Create account |

Empty states, done on 7 November 2026:

| Task | Where it lives |
|---|---|
| E1 unboxed pattern | web `EmptyState` (already), Android `components/EmptyState.tsx` |
| E2 copy, web | Library, Favorites, Browse, Search, book not found, admin tables and dashboard |
| E2 copy, Android | `browse.tsx`, `favorites.tsx`, `library.tsx`, `search.tsx`, `book/[id].tsx`, `admin-notice.tsx`, `_layout.tsx` |
| E3 suggestion row | `components/suggested-books.tsx` under Search and Favorites |
| E4 admin empty rows, chart frame | `data-table.tsx`, `empty-row.tsx`, `download-chart.tsx` |
| E5 Favorites list ↔ empty | `components/favorites-grid.tsx` (`.item-leave`) |

Android motion, done on 7 November 2026 (type-check, lint, and a web bundle pass; not yet run on a device or emulator):

| Task | Where it lives |
|---|---|
| Tokens: `durMove`, `durConfirm`, `durReveal`, `staggerCap`, `durReduced` | `theme/motion.ts` (now React Native `Easing`) |
| A1 press scale | `hooks/use-press-scale.ts`: `Button`, `BookCard` (0.98), chips, tabs, heart |
| A1/A2 entrance and grid stagger | `components/FadeIn.tsx` (`FadeIn`, `useFreshList`): Browse, Search, Library, Favorites, `EmptyState` |
| A3 book detail settle | `app/book/[id].tsx`: cover first, then details from 80ms, 30ms apart |
| A4 heart crossfade and pulse | `components/Crossfade.tsx`, `components/FavoriteButton.tsx` |
| A5 toast enter, exit, replace | `components/Toast.tsx`, used by Favorites (also auto-dismisses after 4s now) |
| A6 sliding, stretching tab pill | `components/TabBar.tsx` (`useTabIndicator`) |

Android uses React Native's `Animated` with the native driver, the same as `Skeleton` and `AIAssistant`, not Reanimated. Reanimated stays installed but nothing imports it. Hold Animated values in `useState(() => new Animated.Value(...))`: the lint rules reject reading `useRef(...).current` during render.

Not done yet: W6 (optional arcs) and D3 (sheet drag). E5 for Library has nothing to animate: there is no way to add or remove a library item in the app yet.

Notes for whoever continues:
- `ViewTransitions` intercepts in-app link clicks on `window` in the capture phase and calls `router.push` inside `document.startViewTransition`. It skips menus, new tabs, modified clicks, downloads, same-URL links, `[data-no-transition]`, and reduced motion. The transition waits at most 500ms for the new route.
- A book card marks its link with `data-vt-cover="book-{id}"`. The detail cover already carries the same `view-transition-name`.
- Plain CSS classes can't take Tailwind variants (`max-md:`). Put breakpoint-specific motion in a media query in `globals.css`, as `.summary-clamped` / `.summary-open` do.

Polish pass, 7 November 2026:
- Book cards lift 2px with a deeper shadow on hover (pointer devices only) and on keyboard focus. Dark covers keep their hairline. `.press-card` in `globals.css`.
- Hover fills on table rows, list rows, and unselected chips ease in over 150ms (`.hover-fill`, chip `before:` layer). Menu items stay instant.
- Featured shelf: arrow steps glide the covers into their new slots with a view transition. Names are set only for the step. Hover waits 80ms before changing the preview (`lib/use-hover-intent.ts`), and the preview fades instead of rising (`.swap-in`).
- Theme reveal removes `view-transition-name` from named elements for the duration, so the book detail cover is revealed with the page instead of crossfading on top.
- Android: `useReduceMotion` is one shared subscription (`useSyncExternalStore`), not one listener per animated control.

Navigation latency fix, 7 November 2026:
- **Don't hold the old page in a view transition while the next route loads.** The first W11 build wrapped every link in `document.startViewTransition` and waited for the new route. A view transition freezes rendering until its callback resolves, so a click showed nothing for up to 540–614ms (measured in dev), and on timeout it animated nothing at all.
- Now: links navigate normally. Reader pages and the book page have `loading.tsx` screens (`components/page-loading.tsx`), so a production build shows them instantly from prefetch. `components/nav-progress.tsx` draws a 2px bar only when a change takes over 120ms.
- The card-to-cover morph is a FLIP animation in `components/view-transitions.tsx`: the click records the card cover's position, and the book page cover (`data-cover`) or the skeleton cover (`data-vt-target`) animates from there when it commits. Book pages skip the page-level fade so the cover isn't fading while it moves.
- Measured in dev after the fix: Browse → Library 376ms to the finished page, Browse → book 339ms, no frozen frames. Dev compiles and skips prefetch; judge speed in `next build && next start`.

## 2. Hard rules

- **Use the existing tokens.** Web: `--ease-*` and `--dur-*` in `web/src/app/globals.css`. Android: `android/theme/motion.ts`. Add a token there before using a new value. Never hard-code a duration or curve in a component.
- **Transform and opacity only.** No animating `width`, `height`, `top`, `left`, or `margin`. Use `transform`, `opacity`, `clip-path`, and `filter: blur()` (blur only on small icons). One exception: the absolutely positioned `.nav-indicator` may transition `width` and `height`, because it is decorative and moves no other element.
- **No bounce on everyday UI.** No spring overshoot, no elastic easing. One-shot confirmations may scale up and settle with `--ease-out`, without going past the end value.
- **No looping motion** except skeletons. No pulsing dots, shimmering gradients, floating elements, marquees, or animated backgrounds.
- **Reduced motion.** Every new animation must be covered by the `prefers-reduced-motion` block in `globals.css` (web) and `useReducedMotion()` from Reanimated (Android). Reduced motion keeps opacity fades of 100ms or less and drops movement and scale.
- **Never block input.** A user can click, type, or navigate during any animation. Nothing waits for an animation to finish.
- **No new dependencies on web.** Use CSS, the Web Animations API, and the View Transitions API, which `book-card.tsx` already uses. Do not add Framer Motion or GSAP.
- **Android:** use `react-native-reanimated` 4 (installed). Only add `react-native-gesture-handler` if you build a drag task (D3). Check it with `npx expo install` so the version matches Expo SDK 58.
- **Avoid the generic AI look.** No sparkle icons, no gradient or cream backgrounds, no boxed cards around sections, no all-caps eyebrows, no periods at the end of titles.

## 3. Motion tokens

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Anything entering or responding |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Anything leaving |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Anything moving from A to B on screen |
| `--dur-press` | 100ms | Press feedback |
| `--dur-hover` | 150ms | Hover, icon crossfades |
| `--dur-menu` / `-exit` | 180 / 145ms | Menus, popovers, tooltips |
| `--dur-panel` / `-exit` | 250 / 200ms | Dialogs, toasts, bottom sheet |
| `--dur-drawer` / `-exit` | 300 / 240ms | Side drawer |
| `--dur-page` | 250ms | Page and list entrances |
| stagger | 30ms per item, capped at 12 items | Lists and grids |

Add these tokens (web and Android):

| Token | Value | Use |
|---|---|---|
| `--dur-move` | 220ms | Sliding indicators, shared elements inside one page |
| `--dur-confirm` | 320ms | One-shot success pulse |
| `--dur-reveal` | 400ms | Mask reveals (theme switch, summary expand) |

## 4. The 20 rules: status today

Status is from an audit of the code on 7 November 2026.

| # | Rule | Web today | Android today | Task |
|---|---|---|---|---|
| 1 | Ease-out for entrances | Done: page, menu, dialog, sheet, toast | Not used | A1 |
| 2 | Dropdowns at 150–250ms | Done: menu 180ms | n/a | Tooltip has no motion: W1 |
| 3 | Stagger list rows by 30ms | Done: `BookGrid` | None | W2 (admin rows), A2 |
| 4 | Scale to 0.97 on press | Done: `.press` on buttons, chips, theme toggle | None | W3 (rail, tabs, rows), A1 |
| 5 | Stretch moving knobs 12% | Missing: theme toggle swaps instantly | Missing | W4 |
| 6 | Stagger as details settle | Missing: book detail column appears at once | Missing | W5, A3 |
| 7 | Arcs for object movement | Missing | Missing | W6 (optional) |
| 8 | Pulse to confirm success | Missing: heart and Save only show a toast | Missing | W7, A4 |
| 9 | Ease-in-out for moves | Done: view transition on cover | None | Use in W4, W5, W6, W8 |
| 10 | Popovers start at 0.95 | Done: `pop-in` | n/a | Keep |
| 11 | Enter from the trigger | Partly: menus yes, dialogs open from center | No | W9 |
| 12 | Exit to the trigger | Partly: menus yes, dialogs no | No | W9 |
| 13 | No bounce on everyday UI | Done | n/a | Keep |
| 14 | Don't tween while held | Done: `.press:active` has no transition | n/a | Keep, and apply to drag in D3 |
| 15 | Exits 20% shorter | Done for menu, dialog, sheet. Toast has no exit at all | No toast exit | W10, A5 |
| 16 | Overlap old and new states | Missing: pages only fade in, empty ↔ list swaps instantly | Missing | W11, E5 |
| 17 | Masks for reveals and colour | Missing | Missing | W12 |
| 18 | Crossfade icons with blur | Missing: heart, sun/moon, eye, pending labels swap instantly | Missing | W13, A4 |
| 19 | Rubber band past bounds | Missing | Missing | D3 |
| 20 | Reuse the same layoutId | Partly: cover → detail view transition. Active nav pill and chip jump | Missing | W8, A6 |

## 5. Web tasks

Do them in this order. Each task lists the files to edit and what "done" means.

### W1. Tooltip motion
`components/ui/tooltip.tsx`. Use the menu pattern: `pop-in` from scale 0.95 at `--dur-menu`, exit at `--dur-menu-exit`, `transform-origin` from `--radix-tooltip-content-transform-origin`. Add a 300ms open delay. No delay when moving between rail items while a tooltip is already open (Radix `skipDelayDuration`).

### W2. Stagger admin rows
`components/data-table.tsx` (and the latest-registrations list in `admin/page.tsx`). Add the `.stagger` class to the row container on first render only. Do not replay when sorting, paginating, or filtering. Those should crossfade (W11).

### W3. Press feedback everywhere it's missing
Add `.press` to side-rail links, tab-bar links, the admin row menu trigger, pagination links, and the `CardFavorite` button. Book cards keep `.press-card` (0.98). Do not scale whole table rows.

### W4. Theme toggle: sliding knob that stretches
`components/theme-toggle.tsx` (the segmented version on Profile).
- Render one absolutely positioned indicator behind the two options instead of colouring the selected button.
- On change, move it with `transform: translateX()` over `--dur-move` with `--ease-in-out`.
- While moving, stretch it by 12% in the direction of travel: keyframes `scaleX(1) → scaleX(1.12) at 50% → scaleX(1)`, with `transform-origin` on the trailing edge.
- Text colour crossfades at `--dur-hover`.

### W5. Book detail settles in order
`app/(app)/books/[id]/page.tsx`.
- The cover already morphs from the card through `transitionName`. Keep it.
- Wrap the detail column children (title, author, details list, summary, actions) in `.stagger`, starting 80ms after the cover lands (add a `--stagger-start` custom property; default 0).
- "More in {category}" does not stagger. It fades in with the page.

### W6. Arcs for the featured shelf (optional)
`components/featured-shelf.tsx`. When the arrows change the focal book, the cover moving into the focal slot follows a slight arc, not a straight line.
- Use the Web Animations API on the incoming cover: keyframes for `translate` from its old slot to the new slot, with a middle keyframe raised by 8px. Duration `--dur-move`, `--ease-in-out`.
- Do this only if the cover keeps its size or scales smoothly. If it gets messy, skip this task. It's the lowest priority.

### W7. One-shot success pulse
- **Heart** (`components/favorite-button.tsx`): when it becomes active, scale `1 → 1.15 → 1` over `--dur-confirm` with `--ease-out`, together with the icon crossfade (W13). No pulse when removing.
- **Save buttons** (`account-panel.tsx`, `security-panel.tsx`): after a successful save, crossfade the label to a check icon plus "Saved" for 1.5s, then back. The button keeps its width so nothing shifts. The toast stays for screen readers.
- Never loop. Never pulse on failure. Failure gets the error text only.

### W8. Shared active indicator ("same layoutId")
One indicator element per nav group that moves to the active item instead of each item having its own background.
- Groups: side rail, tab bar, category chips, analytics date range.
- Approach: give each group's indicator one `view-transition-name` (e.g. `rail-indicator`) and wrap the navigation in `document.startViewTransition`, as `book-card.tsx` already does. Fallback: a single absolutely positioned indicator, measured with refs, that moves with `transform` at `--dur-move` and `--ease-in-out`.
- The icon or label colour swaps at `--dur-hover`.
- Keep `aria-current` on the item. The indicator is decorative (`aria-hidden`).

### W9. Dialogs enter from and exit to their trigger
`components/dialog.tsx`.
- When a dialog opens, read the trigger's bounding box and set `--origin-x` / `--origin-y` on the content.
- `dialog-in`: start at scale 0.95, `transform-origin` at the trigger, `--dur-panel`, `--ease-out`. `dialog-out` returns to the same origin at `--dur-panel-exit`, `--ease-in`.
- Targets: the `CardFavorite` sign-up prompt (from the heart), the book Delete dialog (from the row menu), user Delete (from its button), the limit dialog.
- Without a trigger, fall back to center.

### W10. Toast exit
`components/toast.tsx`. Keep the item mounted in a `leaving` state. Animate `opacity → 0` and `translateY(8px)` at `--dur-panel-exit` with `--ease-in`, then unmount. A new toast replaces the old one by crossfading: the old one leaves while the new one enters (rule 16).

### W11. Overlap old and new states
- **Page changes**: replace the keyed `.page-enter` wrapper in `app-shell.tsx` with a root view transition: old page fades out over 150ms, new page fades in and rises 8px over `--dur-page`, overlapping. Book covers keep their own named transition.
- **Filter, sort, pagination**: the grid crossfades (old out 120ms, new in 200ms). It does not re-stagger.
- **List → empty and empty → list**: see E5.

### W12. Masks for reveals and colour
- **Theme switch**: wrap `applyTheme` in `document.startViewTransition`. Reveal the new theme with `clip-path: circle()` growing from the centre of the toggle that was clicked, over `--dur-reveal`, `--ease-in-out`. With reduced motion, swap instantly.
- **Summary expand** (book detail, mobile): replace the short/long summary swap with a "Read more" button. Expand by animating a `mask-image` gradient from the bottom edge, not `height`. Collapse reverses at the exit duration.

### W13. Icon crossfade with blur
Make one `IconSwap` component: both icons stacked in the same box. The leaving icon goes `opacity 0, scale 0.8, blur(2px)`. The entering icon goes from that state to `opacity 1, scale 1, blur(0)`. Duration `--dur-hover`, `--ease-out`.
- Use it for: heart outline ↔ filled, theme sun ↔ moon, password eye ↔ eye-off, button label ↔ check (W7).
- Pending labels ("Log in" → "Logging in"): crossfade the text, and keep the button width fixed so it doesn't jump.

## 6. Android tasks

`android/theme/motion.ts` already mirrors the web tokens but nothing uses them except the AI sheet and skeleton. Add `durMove`, `durConfirm`, and `durReveal` there.

### A1. Press and entrance
Make one press-scale hook (built as `usePressScale`): scale to 0.97 on press-in (`withTiming(durPress, easeOut)`), back to 1 on release. Use it for `Button`, chips, tab items, and book cards (0.98). Screens enter with a `FadeIn` plus an 8px rise at `durPage` and `easeOut`.

### A2. Grid stagger
`BookGrid` / `FlatList` items: `entering={FadeInDown.duration(durPage).delay(Math.min(index, 12) * stagger).easing(easeOut)}`. Only on first mount, not on scroll recycling.

### A3. Book detail settle
Same order as W5. Try a shared element transition for the cover from the card if Reanimated 4 supports it on this Expo version. If not, the cover fades in first and the column staggers after it.

### A4. Heart and icon crossfade
Same behaviour as W7 and W13: one-shot scale pulse on add, crossfade between the outline and filled heart. No blur on Android (it's expensive). Use opacity and scale only.

### A5. Toast exit
Toasts leave with `FadeOutDown` at `durPanelExit` and `easeIn`.

### A6. Tab bar indicator
One indicator view behind the active tab. It moves with `withTiming(durMove, easeInOut)` and stretches 12% while moving (same as W4).

### D3. Bottom sheet drag with rubber band (web and Android, optional)
The AI assistant bottom sheet (mobile only).
- Drag the handle to move the sheet. The sheet follows the finger exactly while held: no tween (rule 14).
- Dragging up past the open position resists. The extra distance is multiplied by `0.2` (rubber band, rule 19). On release, it returns to the open position at `--dur-panel`, `--ease-out`.
- Dragging down more than 30% of its height, or flicking fast, closes it with the exit animation. Otherwise it returns.
- Android needs `react-native-gesture-handler` for this. Web uses pointer events.

## 7. Empty states

### E1. Pattern (web and Android)
- **No box.** Text on the page background, left-aligned, at most 560px wide. Web `EmptyState` already does this. **Android `EmptyState` still draws a filled panel.** Remove `backgroundColor`, `borderRadius`, and the 32px padding there.
- **Parts**: muted 24px line icon (optional), a title with no period, one sentence of body text, and at most one action.
- **Title says what is missing.** The body says how to fill it. The action does it.
- **No illustrations, no mascots, no looping animation.** The empty state enters with the page (fade plus 8px rise). The icon does not move.

### E2. Copy per screen

| Screen | Title | Body | Action |
|---|---|---|---|
| Library (empty) | Your library is empty | Books you download show up here. | Browse books → `/browse` |
| Favorites (empty) | No favorites yet | Tap the heart on any book to keep it here. | Browse books → `/browse` |
| Browse, category with no books | No books in {category} | Try another category. | Show all books → `/browse` |
| Search, no matches | No matches for "{query}" | Check the spelling or search by author. | Clear search. If a category is set: "Search all categories" |
| Book not found | This book isn't in the library | It may have been removed. | Back to Browse |
| Admin downloads table | No downloads yet | (none) | (none) |
| Admin download chart | No downloads yet | (none) | (none) |
| Admin users search | No users match "{query}" | (none) | Clear search |
| Admin books search | No books match "{query}" | (none) | Clear search |
| Admin, needs attention | Nothing to fix | (none) | (none) |
| Admin, latest registrations | No accounts yet | (none) | (none) |
| Guest on Library, Favorites | Keep the existing locked panel | | |

Android today still has periods in its empty-state titles (`browse.tsx`, `favorites.tsx`, `library.tsx`, `search.tsx`, `book/[id].tsx`, `admin-notice.tsx`, `_layout.tsx`). Fix them to match this table.

The Library body mentions downloading. Book detail has no Download button yet. Until it does, use: "Books you save show up here."

### E3. Useful content under the empty state
For **Search, no matches** and **Favorites (empty)**, show a short row of real books under the empty state with the heading "Try one of these" (6 books on desktop, 4 on mobile). Don't call it "Popular": there is no download data to back that. Use the existing `BookGrid`. This replaces the need for an illustration.

### E4. Admin empty states stay inside their table
For tables, render the empty text as one full-width row in the table body, so the header and pagination don't move. For the chart, keep the baseline and axis labels and put "No downloads yet" in the plot area, so the layout doesn't jump when data arrives.

### E5. Transition between list and empty
When the last favorite is removed (the Undo toast flow in `favorites-grid.tsx`): the card leaves (fade plus scale 0.96 at `--dur-panel-exit`), and the empty state fades in overlapping it (rule 16). Undo reverses this. Same for Library when it gains or loses its last item.

## 8. Accessibility checks
- `prefers-reduced-motion`: every new class is in the reduced-motion block. Test with the OS setting on.
- Focus stays on the trigger after a dialog closes. Animations don't move focus.
- Nothing announces twice: decorative indicators are `aria-hidden`. The toast stays `role="status"`.
- The success pulse and icon swaps are not the only feedback. The toast or text change is still there.

## 9. How to check your work
1. `cd web && npx tsc --noEmit -p . && npx eslint src`
2. `cd android && npx tsc --noEmit && npx eslint theme app components`
3. In the browser at 1280px and 375px, check each task. Use the DevTools Animations panel at 10% speed to check the curves and durations against section 3.
4. Turn on reduced motion and repeat. Nothing should move. Fades of 100ms or less are allowed.
5. Check `/dev/states` for every empty state. Add a sample for any state in E2 that isn't there.
6. Check that no new dependency was added on web (`git diff web/package.json` is empty).
7. Update `docs/screens.md` with any new state, and `design/tokens.md` with the new motion tokens.

## 10. Out of scope
- New features (Download, reader view, AI answers). Motion only applies to what exists.
- Haptics on Android. Note it as a follow-up if useful; do not add `expo-haptics` in this pass.
- Sound.
