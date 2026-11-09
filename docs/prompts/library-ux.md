# Library: UX audit and implementation prompts

Scope: the reader's **Library** on web (`/library`) and Android (Library tab), and what feeds it: Add to Library, reading lists, collections, downloads on the device, reading progress, removal, and sorting.

Method: code review of the current working tree (9 November 2026, including uncommitted collections work), then an on-screen check signed in as a test reader. The check was done in dark mode at 1280px, at about 800px, and at 375px. Section 2.8 lists what the screen confirmed and what it added. Nothing was added, removed, or deleted during the check.

Nothing in this file has been implemented.

---

## 1. How the Library works today

| Piece | Web | Android |
|---|---|---|
| Sections | `Library`, `Reading lists`, `Collections`, `Downloaded`, switched with a ‹ › pager showing "1 of 4" (`components/library-views.tsx:26`, `:232`) | Same four, same pager (`app/(tabs)/library.tsx:235`) |
| Page title | Changes to the section name ("Reading lists"…) | Always "Library" |
| Card corner | Heart + a 44px "on this device" circle, stacked (`components/book-marks.tsx`) | `CardMarks`, heart + download mark |
| Selecting | Trash-can button toggles selection mode; one action, "Remove" / "Remove from list" | Long-press a card; actions **Favorite**, **Add/Remove from Library**, **Delete**, **Cancel** |
| Sort | Library section only: Recently added, Title, Author | None |
| Add to Library | Opens a dialog: radio list of "Library", each group, or "Create new" (`components/add-to-library.tsx`) | `AddToLibraryModal` (same idea) |
| Remove from Library | Pressing "In Library" removes immediately, and drops the book from every group | Bulk "Delete" (see L7) |
| Reading lists vs collections | Same UI, same data shape (`lib/collection.ts`); a reading list is described as "read through", but there's no order, next-up, or progress | Same |
| Downloaded | Books saved in this browser (IndexedDB) | Books saved on this device |
| Download history | A separate nav item and page (`/downloads`) | Separate screen |
| Reading progress | Saved per book by the reader (`/api/books/[id]/progress`) | Saved by the reader |
| Progress shown in Library | **No** | **No** |

---

## 2. Findings

Severity: **High** blocks or misleads readers, or loses data. **Medium** is real friction. **Low** is polish.

### 2.1 Structure and navigation

| ID | Sev | Finding | Recommendation |
|---|---|---|---|
| N1 | **High** | **Sections hide behind a carousel pager.** "‹ Library 1 of 4 ›" shows one section at a time, so readers can't see that Reading lists, Collections and Downloaded exist without stepping through. The "1 of 4" counter is decorative numbering, one of the generic AI patterns to avoid. | Use a visible tab row (underlined text tabs, the same style as admin section tabs), with all four labels shown at once. No counter. |
| N2 | **High** | **The section isn't in the URL.** Refreshing, sharing, or Back always lands on "Library"; the browser Back button doesn't move between sections. | `?view=lists \| collections \| on-device` (default omitted). Tabs are links. |
| N3 | Medium | **The title changes on web but not Android.** The web `h1` becomes "Reading lists" while Android stays "Library"; the pager repeats the same label under the title. | Keep `h1` "Library" on both. The tab row says which section is open. |
| N4 | Medium | **"Downloaded" and "Download history" overlap.** There's a Library section, a separate nav item, and a mark on every card, all about downloads. Readers have to learn three places. | Library → **On this device** (files you can read offline, with storage used). Profile → **Download history** (the quota record). Remove "Download history" from the main nav; link it from the quota menu and Profile. |
| N5 | Medium | **Reading lists and collections are the same thing twice.** Same UI, same data, different names. The "read through" promise (`library-views.tsx:151`) has nothing behind it: no order, next-up, or progress. | Merge into one concept, **Collections** (named shelves). Add reading status as built-in shelves instead (N6). If ordered lists are wanted later, make "ordered" a setting on a collection, not a second type. |
| N6 | **High** | **There's no "Continue reading".** The reader stores progress per book, but the Library never shows it. Showing what you're reading and how far you've got is the core of every e-library (Apple Books, Kindle, Libby). | Top of Library: a **Continue reading** row (books with 0% < progress < 100%, most recent first, a progress bar, and a Resume button). Built-in shelves derived from progress: **Reading**, **Not started**, **Finished**. |

### 2.2 Cards and controls

| ID | Sev | Finding | Recommendation |
|---|---|---|---|
| C1 | **High** | **Two 44px circles cover the top-right of every cover** (heart above the download mark, `book-marks.tsx`). On a 160px card they cover about a third of the cover and its title. | One control in the corner (the heart, or a ⋯ menu). Show "on device" as a small inline label under the author ("On this device"), not as a button-shaped badge. |
| C2 | **High** | **The download mark looks like a button but isn't.** It's a bordered circle `span`, dark when downloaded, and the download icon suggests an action. Pressing it does nothing. | A static text mark with a small check, or nothing. Downloading belongs on the book page and in the card menu. |
| C3 | **High** | **A Library card has no Library control.** Removing a book means finding the trash-can mode toggle. The bookmark from the last round was replaced by the marks. | Per-card ⋯ menu: Open, Resume (if in progress), Add to collection…, Download / Remove download, Favorite, **Remove from Library**. Keep the heart outside as the one quick action. |
| C4 | Medium | **No progress on cards.** | A 2px bar under the cover plus "34%" or "Finished". Hide it for books never opened. |
| C5 | Low | **"Keep {title} in Library"** (icon aria-label in `add-to-library.tsx`) reads as an instruction, not a state. | aria-label "In Library: {title}" with `aria-pressed`, or move to the ⋯ menu. |

### 2.3 Selecting and bulk actions

| ID | Sev | Finding | Recommendation |
|---|---|---|---|
| S1 | **High** | **A trash-can icon enters selection mode** (`library-views.tsx:171`). Trash means delete, so pressing it to *select* is alarming, and nothing explains it. | A text button **Select** in the toolbar. Selection mode shows a bottom action bar. |
| S2 | **High** | **Android "Delete" means two different things** (`library.tsx:93`). It removes the file if the book is on the device, otherwise it removes the book from Library. The same button, two outcomes, no confirmation. | Separate actions with exact labels: **Remove from Library**, **Remove download**. Never "Delete" for a library entry. |
| S3 | Medium | **Web and Android offer different bulk actions.** Web has Remove only; Android has Favorite, Add/Remove, Delete, Cancel. | Same set on both: Add to collection…, Favorite, Remove download, Remove from Library. Show only the actions that apply to the current selection. |
| S4 | Medium | **Bulk removal has no Undo.** A loop of silent removals and a count toast (`library-views.tsx:130`). | One toast "Removed 4 books from Library" with Undo that restores all of them, including their collections (see D1). |
| S5 | Low | **Android uses long-press to select** with no hint; web uses a button. | Both: a **Select** button. Android may also allow long-press as a shortcut. |

### 2.4 Data safety

| ID | Sev | Finding | Recommendation |
|---|---|---|---|
| D1 | **High** | **Removing a book from Library silently drops it from every collection** (`add-to-library.tsx` comment, `shelf.set("library", false)`). Undo restores the Library row only, so collection memberships are lost for good. | Either keep memberships and hide the book while it's off the shelf, or have Undo restore them. If removal has to cascade, say so in the toast: "Removed from Library and 2 collections". |
| D2 | **High** | **Removing a book from one reading list removes it from all of them.** `removeBooksFromKind` (`lib/collections.ts:90`) deletes the book from every group of that kind, but the reader selected it inside one list. | Remove from the group the reader is looking at only (`collection_id = …`). |
| D3 | **High** | **Deleting a collection is instant, with no confirmation and no Undo** (`library-views.tsx:142`, Android `library.tsx:288`). | Confirm with the name and book count ("Delete Poetry? Its 6 books stay in your Library."), or delete with Undo. A trash icon alone shouldn't be the only label: use a ⋯ menu with Rename and Delete. |
| D4 | Medium | **Android hides books that aren't downloaded when offline** (`library.tsx:55`). The count changes and nothing explains why. | Keep every book listed. Dim the ones not on the device and add a note at the top: "You're offline. 3 books on this device can be read." |

### 2.5 Adding to Library

| ID | Sev | Finding | Recommendation |
|---|---|---|---|
| A1 | Medium | **Every add opens a dialog**, even when the reader only wants the book on the shelf. That's an extra step for the most common case. | Add straight away and show a toast: "Added to Library · Add to collection". The toast action opens the picker. Keep the picker for "Add to collection…" in the ⋯ menu. |
| A2 | Medium | **The picker allows one place only** (radio buttons) and mixes "Library" in with groups. | Use checkboxes for collections, since a book can be in several. Library membership is implied, and "New collection" is an inline field at the bottom. |
| A3 | Low | **The dialog repeats "This does not use a download"**, as does the empty state. | Say it once, where the question comes up: the empty state and the first-add toast. |
| A4 | Medium | **Removal is easy to trigger by accident.** The labelled "In Library" button removes on press. | Pressing "In Library" opens a small menu: Add to collection…, Remove from Library. |

### 2.6 Sort, search, layout

| ID | Sev | Finding | Recommendation |
|---|---|---|---|
| L1 | Medium | **Sort exists on web only, and only for the Library section.** | Same sort on both platforms and every section: Recently read (default once progress exists), Recently added, Title, Author. |
| L2 | Medium | **No way to find a book inside your own Library.** | A filter field in the Library toolbar (title or author, client-side). |
| L3 | Low | **Grid only.** Long libraries scan better as a list. | Grid/list toggle, remembered per device (localStorage). List rows: small cover, title, author, progress, ⋯. |
| L4 | Low | **Collections show no counts or covers before you open them.** | A collections index: name, book count, a strip of up to 3 covers, last updated. Open a collection to see its grid. |
| L5 | Low | **The "New reading list" form sits at the top of the section before any content** (`NewGroup`). | Put a **New collection** button in the toolbar, with the inline form or a dialog on demand. Empty state: "Make a collection to group books, like Poetry or Summer reading." |

### 2.7 Accessibility

| ID | Sev | Finding | Recommendation |
|---|---|---|---|
| X1 | Medium | **The pager buttons are labelled "Previous page" / "Next page"**, which sounds like pagination, not sections. | Fixed by N1: tabs with `aria-current="page"`. |
| X2 | Medium | **The selection-mode toggle's label changes** across three strings (`library-views.tsx:167`). | A **Select** button. In selection mode a separate **Done** button appears, and the bar is `role="toolbar"` with a live "3 selected". |
| X3 | Low | **The on-device mark is a labelled `span`.** Screen readers announce it, but it can't be focused, which is confusing next to a real button. | Plain text inside the card link: "On this device". |

### 2.8 Confirmed on screen, and new findings

Confirmed as described: N1 (the pager reads "Library · 1 of 4"), N2 (the URL stays `/library` in every section), N3 (the title becomes "Reading lists"), C1 (heart and download mark stacked on the cover), S1 (a trash icon starts selection), A1 (Add to Library always opens a dialog).

New findings from the screen:

| ID | Sev | Finding | Recommendation |
|---|---|---|---|
| V1 | **High** | **The download mark covers the cover title.** On "Abraham Lincoln's Second Inaugural Address" the second circle sits on top of the title text, at desktop and phone widths. | Covered by Prompt 3 (one corner control, device status as text under the card). |
| V2 | **High** | **"Downloaded" contradicts the quota.** The test account had used 2 of 10 downloads, yet "Downloaded" said "Nothing on this device yet": that section only lists files saved in *this* browser. A reader sees downloads counted but none in their Library. | Covered by Prompt 8. Also say what the section is: "Files saved in this browser for offline reading. Books downloaded on other devices are in Download history." |
| V3 | Medium | **The "Downloaded" empty state is incomplete:** a title and a button, no icon and no sentence explaining how a book gets there. | Use the standard empty state: icon, "Nothing on this device yet", "Download a book from its page to read it offline here.", [Browse your Library]. |
| V4 | **High** | **Selection mode is hard to see and shifts the page.** The selection circle is dark grey on dark covers, nearly invisible, and sits on the cover's decorative dash. The ✕ icon and the Cancel button do the same thing. The selection bar is inserted above the grid, pushing every card down. | Covered by Prompt 7, plus: a white circle with a dark outline on covers (always visible), one way out ("Done"), and a sticky bar at the bottom so the grid doesn't move. |
| V5 | Medium | **The "Summer reading" placeholder reads like a typed value.** It's bright enough in dark mode to look like a filled field next to a disabled Create button. | Placeholder in the muted colour, or a label-only field with no example. Covered by Prompt 5 (the form moves into a dialog). |
| V6 | **High** | **Dark mode: dialogs barely separate from the page.** The backdrop `rgba(31,35,48,0.4)` is lighter than the dark page `#14161D`, so it slightly *lightens* the page instead of dimming it. The dialog surface `#1C1F28` is very close to the page. This affects every dialog, not just Library. | See Prompt 10. |
| V7 | Medium | **The header search breaks at medium and phone widths.** At about 800px the "Ctrl K" hint overlaps the placeholder. At 375px the placeholder is cut to "Search bo". | See Prompt 10. |
| V8 | Medium | **Phone layout order:** a full-width sort menu sits above the section pager, before any books. The bottom bar has 5 tabs (Browse, Library, Favorites, Downloads, Profile), which is crowded at 375px. The floating "Ask AI" button sits over the grid. | Sort goes in the toolbar row with Select (Prompt 9). Removing Downloads from the main nav (Prompt 8) brings the bar back to 4 tabs. Hide "Ask AI" on Library, or move it into the toolbar. |

### 2.9 Generic-AI patterns present here

- **Decorative numbering:** "1 of 4" in the pager (N1).
- **Pill and circle overload:** circle buttons for the pager, the mode toggle, the heart and the download mark, all 44px with borders (C1).
- **A trash icon used as a mode switch** instead of plain words (S1).

None of the following should be introduced while fixing these: eyebrows or all-caps labels, sparkle icons, gradients, boxed section cards, cream backgrounds, three-card feature rows, or periods in titles.

---

## 3. Target design

**Principles**
1. **Reading first.** The Library opens on what you're in the middle of.
2. **Covers carry the colour.** The interface stays quiet: one control per card, text labels for actions.
3. **Every destructive action names what it removes**, and can be undone.
4. **The same model and the same words on web and Android.**

**Library page layout (web; Android mirrors it in one column)**

```
Library                                   [Select] [Sort ▾] [Filter books…]
3 reading · 12 in Library
──────────────────────────────────────────
All   Reading   Finished   Collections   On this device        (text tabs, underline)
──────────────────────────────────────────
Continue reading                                     (only on "All", only if any)
[cover] Frankenstein · 34% ▬▬▬───  Resume
[cover] Walden · 8%  ▬────────    Resume

All books
[grid of cards: cover, title, author, progress bar, "On this device", ♥, ⋯]
```

- **Words:** Library, Collections, On this device, Download history (Profile), Remove from Library, Remove download, Add to collection…
- **Statuses:** Reading = progress above 0% and below 100%. Finished = 100%, or marked finished from the ⋯ menu. "Not started" isn't a tab; it's a filter option.
- **Empty states:** a title with no period, one sentence, one action. For example: Reading → "Nothing in progress" / "Open a book from your Library to start." / [Browse your Library].

---

## 4. Implementation prompts

Run them in order. Each prompt is self-contained: paste it as the task. All of them share the rules in 4.0.

### 4.0 Rules for every prompt

- Work in `web/` and `android/` with the same behaviour and copy. Where one platform can't match, say so in the PR.
- Follow `docs/prompts/motion-and-empty-states.md` for motion and empty states, and `design/tokens.md` for colours and type.
- Don't add: eyebrows or all-caps labels, sparkle icons, gradients, boxed section cards, decorative counters, periods in titles.
- Every destructive action names what it removes and offers Undo, or a confirmation when Undo isn't possible.
- Finish each prompt with web `npx tsc --noEmit -p . && npx eslint src` and Android `npx tsc --noEmit && npx eslint app components hooks theme lib` passing. Check web at 1280px and 375px.

### Prompt 1: Data safety fixes (D1, D2, D3)

> Fix three data-loss paths in the Library.
> 1. `web/src/lib/collections.ts` `removeBooksFromKind`: remove the books from the **one** collection the reader is viewing. Change the signature to take `collectionId`, check ownership, and delete only from `collection_items` where `collection_id = collectionId`. Update `removeFromGroupsAction` in `web/src/lib/actions.ts`, its callers in `components/library-views.tsx`, and the Android equivalent in `android/lib/collections.ts` and `app/(tabs)/library.tsx`.
> 2. Removing a book from Library must not lose its collections for good. Implement it as: before removing, read the book's memberships (`collection_id`, `position`). Return them from the server action. Undo restores the Library row and those memberships at their positions. The toast says "Removed from Library" or "Removed from Library and N collections".
> 3. Deleting a collection asks first: a dialog titled "Delete {name}?", body "Its {n} books stay in your Library.", buttons Cancel / Delete. Use the shared `Dialog`; Android uses `Modal` like `SignUpPrompt`.
>
> Done when: removing from one reading list leaves the book in the others; Undo after removing from Library restores collection memberships; a collection can't be deleted in one tap.

### Prompt 2: Sections as tabs in the URL (N1, N2, N3, X1)

> Replace the ‹ › section pager in `web/src/components/library-views.tsx` and `android/app/(tabs)/library.tsx` with a visible tab row.
> - Tabs: All, Reading, Finished, Collections, On this device. (Reading and Finished arrive with Prompt 4. Until then, ship All, Collections, On this device.)
> - Web: tabs are `Link`s to `/library?view=…` (default `all`, omitted from the URL). Underline style like the admin section tabs. Use the shared `useIndicator` for the underline. `aria-current="page"` on the active tab.
> - Android: a horizontal row of text tabs under the title. The selected tab gets an underline indicator (reuse the TabBar indicator approach).
> - `h1` stays "Library" on both. Remove the "1 of 4" text and the per-section lede swaps. Use one lede: "{n} in Library", plus "{n} reading" once Prompt 4 lands.
> - Selection mode resets when the tab changes.
>
> Done when: refreshing or sharing a URL opens the same section, browser Back moves between sections, and no counter appears.

### Prompt 3: One card control and an honest device mark (C1, C2, C3, C5, X3)

> Simplify Library cards on both platforms.
> - Remove `web/src/components/book-marks.tsx` and Android `CardMarks` from Library cards. The corner holds one 44px control: a ⋯ menu button (web `DropdownMenu`, Android an action sheet via `Modal`). aria-label "Actions for {title}".
> - Menu items, in order, showing only what applies: Resume (if progress is between 0 and 100), Add to collection…, Favorite / Remove from favorites, Download / Remove download, Remove from Library.
> - "On this device" becomes plain text under the author (12px, muted, with a 12px check icon). It isn't interactive and isn't a separate badge.
> - Favorites and Browse cards keep the heart. Only Library cards switch to ⋯.
>
> Done when: each Library card has exactly one corner control, the cover shows its title, and every Library action is reachable from the card.

### Prompt 4: Continue reading and reading status (N6, C4)

> Use the stored reading progress in the Library.
> - Server: add `listProgress(userId)` (web, from the same source as `/api/books/[id]/progress`) returning `{ bookId, progress (0–1), updatedAt }`. Android: read the same through its API module.
> - "All" tab: if any book is in progress, show a **Continue reading** row above the grid. Up to 6 books, most recently read first. Each has the cover, title, a 2px progress bar, "34%", and a **Resume** link to `/read/{id}`. Phones get a horizontal scroll row.
> - Cards: a 2px progress bar under the cover plus "34%" or "Finished". Nothing for books never opened.
> - Tabs: **Reading** (0 < p < 1) and **Finished** (p = 1, or marked finished). Add "Mark as finished" / "Mark as unread" to the card menu, stored as progress 1 / 0.
> - Empty states: Reading → "Nothing in progress" / "Open a book from your Library to start." Finished → "No finished books yet" / "Books you finish show up here."
>
> Done when: a book read halfway appears in Continue reading and under Reading with 50%, and finishing it moves it to Finished.

### Prompt 5: Collections only, with an index (N5, L4, L5)

> Merge reading lists into collections.
> - Migration (new file under `supabase/migrations/`): set `kind = 'collection'` for every row. Keep the column for now, but stop writing `reading_list`. Rename duplicate names by appending " (2)".
> - UI copy on both platforms: "Collections" only. Remove `kindLabel` choices from `add-to-library.tsx` and `AddToLibraryModal`.
> - The Collections tab shows an index: each collection as a row with its name, "{n} books", up to 3 small covers, and a ⋯ menu (Rename, Delete, with Delete from Prompt 1). Opening a row shows that collection's grid at `/library?view=collections&c={id}`, with a Back link.
> - A **New collection** button in the toolbar opens a small dialog with a name field. Remove the always-visible form.
> - Empty state: "No collections yet" / "Group books, like Poetry or Summer reading." / [New collection].
>
> Done when: there's one concept, readers can see every collection with its count before opening it, and nothing called "Reading list" remains.

### Prompt 6: Adding and removing without friction (A1–A4)

> Make Add to Library one step.
> - Pressing **Add to Library** (book page and card menu) adds at once. Toast: "Added to Library", with action **Add to collection**, which opens the picker.
> - Picker (`web/src/components/add-to-library.tsx`, `android/components/AddToLibraryModal.tsx`): a checkbox list of collections (the book can be in several), with the current memberships pre-checked, and a "New collection" field at the bottom. Save applies the differences. Title: "Add to collection".
> - Pressing **In Library** on the book page opens a small menu: Add to collection…, Remove from Library (which uses the Prompt 1 Undo).
> - Say "doesn't use a download" only in the Library empty state and the first-add toast of a session.
>
> Done when: adding a book takes one press, a book can be filed in two collections at once, and nothing is removed by one tap on a state label.

### Prompt 7: Select and bulk actions, the same on both (S1–S5, X2)

> Rebuild selection mode.
> - Toolbar button **Select** (text). In selection mode: a sticky bottom bar (`role="toolbar"`) with a live count ("3 selected") and the actions that apply to the selection: Add to collection…, Favorite, Remove download (only if any selected book is on the device), Remove from Library. Plus a **Done** button.
> - Android: same bar and labels. Long-press may start selection, but the Select button is always there. Remove the "Delete" label everywhere.
> - Bulk removal: one server call. Toast "Removed {n} books from Library" with Undo restoring all of them and their collections (Prompt 1).
> - Inside a collection, the bar offers "Remove from {collection name}" instead of Remove from Library.
>
> Done when: there's no trash icon as a mode switch, no "Delete" for library entries, and identical actions and copy on web and Android.

### Prompt 8: On this device and download history (N4, D4)

> Separate files on the device from the download record.
> - Rename the Library section "Downloaded" to **On this device**. Header line: "{n} books · {size} on this device", with the size summed from the saved rows. Each card's menu has **Remove download**. Toast: "Removed download. It stays in your Library."
> - Remove "Download history" from the main nav (`web/src/components/main-nav.tsx`, Android tabs). Link it from the quota menu ("View download history") and from Profile. The page keeps its content.
> - Android offline: list every Library book. Dim the ones not on the device (opacity 0.5, not pressable for reading, menu still works), and show a note: "You're offline. {n} books on this device can be read."
>
> Done when: downloads appear in one Library section and one history page, and going offline never makes books silently disappear.

### Prompt 9: Find, sort, and view (L1–L3)

> Add Library tools on both platforms.
> - Sort on every tab: Recently read (default when any progress exists), Recently added, Title, Author. Web keeps it in `?sort=`.
> - Filter field "Filter your Library" (title or author, client-side, debounced 150ms) in the toolbar. Empty result: "No books match '{q}'" / [Clear filter].
> - Grid/list toggle (two icon buttons with labels "Grid" and "List", `aria-pressed`), remembered in localStorage / SecureStore. List rows: 48px cover, title, author, progress, On this device, ⋯.
>
> Done when: a reader with 50 books can find one by typing and switch to a list, and the choice survives a reload.

---

### Prompt 10: Dark-mode dialogs and the header search (V6, V7)

> Two app-wide visual fixes found while checking the Library.
> 1. Dialog backdrop and surface in dark mode. In `web/src/app/globals.css` add tokens `--scrim` (light `rgba(31,35,48,0.4)`, dark `rgba(0,0,0,0.6)`) and use it for `Dialog` and `Sheet` overlays instead of the hard-coded `bg-[rgba(31,35,48,…)]` in `components/dialog.tsx` and `components/ui/sheet.tsx`. Dark dialogs also get a 1px `--border` outline so the edge reads against the page. Android: use `colors.scrim` from `theme/tokens.ts` (already dark-aware) in `SignUpPrompt` and `AddToLibraryModal`.
> 2. Header search (`components/search-bar.tsx`, `components/shortcut-hint.tsx`): show the shortcut hint only from 1024px up and reserve right padding only when it's shown. At narrow widths use the short placeholder "Search", so it never truncates mid-word.
>
> Done when: in dark mode a dialog clearly dims the page and has a visible edge, and the search field never shows overlapping or cut-off text at 375px, 800px, or 1280px.

## 5. Open decisions

1. **Removing a book from Library with collections:** keep its memberships while it's off the shelf (recommended), or remove them with Undo.
2. **Merging reading lists into collections** (Prompt 5) changes data. Confirm before running the migration on a shared database.
3. **Mark as finished** stores progress 1. Confirm that's acceptable for the reader's resume position.
4. **Download history out of the main nav:** confirm the quota menu and Profile are enough to reach it.
