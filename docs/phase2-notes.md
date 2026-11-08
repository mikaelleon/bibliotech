# Phase 2 notes

Running log of decisions, deviations from `docs/prompts/phase2-implementation.md`, **[CONFIRM]** items and **[SPIKE]** results.

## Decisions

- **Quota period (2026-11-07):** the quota renews monthly, anchored on the account's registration timestamp (`profiles.created_at`). Short months clamp to their last day. Books first downloaded in earlier periods stay in history and re-download free. Added to the prompt (rules 2, 3, 5; sections 4.1, 4.6, 5, 6; tests 2a).

## Checkpoint 0: Supabase foundation

Status: code done, typecheck, lint and web build pass. **Not run against the live database yet**: migrations are not pushed (the CLI requires explicit consent for hosted changes).

### What replaced what (audit)

| Phase 1 piece | Replaced by |
|---|---|
| `web/src/lib/users.ts` (scrypt hashes in `web/data/users.json`) | Supabase Auth (`signUp`, `signInWithPassword`, `updateUser`) |
| `web/src/lib/session-token.ts` (HMAC cookie, `SESSION_SECRET`) | Supabase auth cookies through `@supabase/ssr`; `web/src/lib/session.ts` reads them with `getClaims()` |
| `web/src/lib/reset-token.ts` (signed reset links, console delivery) | `resetPasswordForEmail` plus `web/src/app/auth/callback/route.ts` (PKCE code exchange) |
| `web/src/lib/records.ts` on `web/data/library.json`, `favorites.json` | Same module on `library_items` and `favorites`, RLS-limited to the owner |
| `web/src/lib/admin.ts` reading the JSON user list | `admin_stats`, `admin_list_users`, `admin_list_downloads` RPCs (called as the signed-in admin) |
| `web/src/proxy.ts` checking the HMAC cookie | Supabase session refresh plus the same redirect rules |
| `android/lib/users.ts` in-memory accounts | Supabase Auth; the file keeps only form rules and the login throttle |
| `android/lib/session.tsx` SecureStore session and shelves | `android/lib/supabase.ts` (`LargeSecureStore`, AppState auto-refresh) and Supabase-backed shelves |
| `web/data/*.json` | Deleted |

### Deviations

- **Books by slug.** The app still reads the catalog from `web/src/lib/books.ts` and `android/lib/books.ts` and addresses books by slug. Migration `20261107140322_catalog_slugs.sql` adds `books.slug` and loads those 19 books so shelf rows have real foreign keys. The importer (checkpoint 4) moves the catalog to the database.
- **"Continue as guest" kept as a visitor flag.** `Session.kind === "guest"` now means a visitor without an account (unsigned `elib_visitor` cookie on web, a SecureStore flag on Android). It grants only public pages. Step 2 renames it to visitor when Guest becomes an unverified account.
- **"Keep me signed in".** Web: without it, Supabase auth cookies are written without max-age (browser-session cookies) via the `elib_short` cookie. Android: the session is signed out on the next cold start.
- **Admin user list** loads up to 1000 users through `admin_list_users` and filters and pages in the server. Step 8 moves filters and paging into SQL.
- **Admin user detail** URLs use the user id (uuid) instead of the email.
- **Android `.env`** held the web file's values, including the secret key under non-`EXPO_PUBLIC_` names. Expo does not bundle those, but the file now holds only `EXPO_PUBLIC_*` values. Rotate the secret key if that file was ever shared.

### Still to do for checkpoint 0

- Push `001`, `002`, `003` and `20261107140322_catalog_slugs.sql` (`supabase db push --remote`).
- Manual run: sign up, log in, log out, Library and Favorites add, remove and Undo, password change, reset email (the built-in sender only reaches project team members until SMTP is set).
- Android needs a new development build (`npx expo run:android`): `@react-native-async-storage/async-storage` and `react-native-get-random-values` are native modules.
- Promote the first admin with the statement in `supabase/dev-seed.sql`.

## Verified flag (ahead of checkpoint 1)

- Bug found in testing: a new, unverified account showed a limit of 10. `quotaFor` gave every account 10 because the verified state didn't exist yet.
- Migration `20261107141845_email_verified_at.sql` adds `profiles.email_verified_at` (clients can't write it). Both apps read it into `Session.verified`; `quotaFor` gives unverified accounts 5 and verified accounts 10. Sign-up copy says so.
- The sessions select `profiles.*` so sign-in keeps working before the migration is pushed (the account reads as unverified).
- Done in the next section: the verification email and link, the monthly reset, and the admin user table and page.

## Checkpoints 1, 2 and 8 (database and verification)

Migration `20261107142501_quota_and_verification.sql`, plus web and Android changes. Typecheck, lint and the web build pass. **Not run against the live database until the migrations are pushed.**

- **Quota period:** `quota_period` (UTC, anchored on `profiles.created_at`), `quota_status`, `my_quota`. Both apps read used, limit and `resetsAt` from `my_quota()` and show "Resets on {date}" (the UTC date).
- **downloads reshaped** to one row per (user, book); `request_download()` is the only writer. The download endpoint that calls it is checkpoint 3.
- **Verification:** `POST /api/auth/send-verification`, `GET /api/auth/verify`, `/verify-email` result page, `GET /api/me`. Web banner on Browse and Profile (server action); Android banner on Browse and Profile (calls the API with a Bearer token; needs `EXPO_PUBLIC_API_URL`). Android reloads the account when the app returns to the foreground.
- **Email change** clears `email_verified_at` through a trigger on `auth.users`. Neither app offers an email change yet.
- **Disposable domains** are blocked at sign-up on web (server action) and Android (client check). Android signs up directly with Supabase, so its check can be bypassed by calling Supabase directly; moving Android sign-up behind the API would close that.
- **Admin:** users table shows type (Registered, Guest (unverified), Administrator), joined date and "x of limit" for this month; the Type filter now filters by tier; the user page shows type, verified date, this month's count and reset date; the downloads table shows last download and times. Filters and paging still run in the server (up to 1000 users).
- **Limit numbers in copy:** sign-up text, banners and the email say "5" and "10" as words. Counts and limits on screen come from the database.
- **Email delivery:** needs `RESEND_API_KEY` and `EMAIL_FROM` (a domain verified in Resend). Without them, development prints the link in the server console.

## [CONFIRM]

- Instructor accepts "Guest = signed up but unverified".
- Standard Ebooks single-book downloads without an account.

## [SPIKE]

- `signUp` returns a session with Confirm email off: handled both ways in code; confirm on first run.
- `getClaims(jwt)` for Bearer tokens: checkpoint 3.
- Reader and text extraction: done in checkpoint 7 (below). `getClaims(jwt)` is used by `requestUser()` for the download and progress routes.

## Checkpoints 4, 5, 6 and 7

### Checkpoint 4 — files and importer

- Migration `20261107233000_book_files.sql` adds file columns, the private `books` bucket, the `file_path` check inside `request_download`, and `reading_progress`. Pushed to the hosted project on 2026-11-08 (`supabase db push --remote`).
- `scripts/import-books/` reads Gutendex for metadata and the Gutenberg robot harvest for files (2 seconds between file downloads, images edition first, skip when both editions are over 5 MB). `--dry-run`, `--limit` (default 30), `--source gutenberg` only. Standard Ebooks stays a hand list in `scripts/data/standard-ebooks.txt`.
- An existing row matches on `(source, source_id)` or on normalized title and author, so the 19 seeded books are updated instead of duplicated. `published` is the author's death year from Gutendex when the harvest has no publication year.
- Web browse, search, book detail, library, favorites, and admin books read `listCatalog()` (`books` ordered by title). Android calls `loadRemoteCatalog()` at startup. Both keep the static list when the query fails or returns nothing.
- The importer uploads the EPUB first and writes `file_path` only after Storage accepts it. A failed upload leaves the book without a file, so a reader is not charged.
- Metadata comes from Gutendex, with retries (2s, 4s, 8s, 16s). If Gutendex does not answer, the importer reads Gutenberg's public `pg_catalog.csv`. Harvest pages follow the next `offset` link, two seconds apart, and stop once every candidate id has a URL. On 2026-11-08 `robot/harvest` returned 404, so the importer uses the PGLAF cache (`aleph.pglaf.org/cache/epub/<id>/`) for those ids only, still two seconds apart. It does not walk `/ebooks/<id>.epub3.images`.
- `--ids 1342,84,...` imports that list. An existing row is also matched by the ebook id in `source_url`. A match updates only the file columns, so the seeded title, summary, year, and category stay.
- On 2026-11-08 Gutendex returned 503 and `robot/harvest` returned 404. The first run saved 30 English texts from the front of `pg_catalog.csv` (about 21 MB, no failures). A second run attached files to 18 of the 19 seeded books. Ebook 1067 is Grant's memoirs, not Locke, so that file was removed and `thoughts-on-education` now links to the Wikipedia article. There is no English Gutenberg EPUB for that title.

### Checkpoint 5 — on the device

- Web: IndexedDB database `elib-offline` v2. Book files and the progress queue are keyed by `userId:bookId`. Log out deletes that account's files and the `elib-*` caches. `public/sw.js` (`elib-shell-v2`) caches same-origin successful responses for `/`, `/browse`, `/search`, and `/_next/static`. It also caches `/read/` after that page has been opened, so a reload in airplane mode can still open the reader. It does not cache `/library`, `/downloads`, `/profile`, `/admin`, `/api`, `/auth`, or `.epub`, and it ignores other sites. A reader opened for the first time while already offline falls back to `/browse`.
- Android: `expo-file-system` `File.createDownloadTask` into `Paths.document/books/<userId>/<slug>.epub`, plus `local_books` and `progress_queue` in `expo-sqlite` (`elib.db`), both keyed by user. Log out deletes that account's files and queued positions.

### Checkpoint 6 — download UI

- Book page: Download, a determinate progress bar, failure with retry, "You already downloaded this book" (repeat does not use a download), and the quota dialog. On the device: Read and Remove from device.
- Web `/downloads` and Android `downloads`: history from `GET /api/downloads`, "On this device", remove one, remove all. Removal does not refund a download. The web copy says a browser may evict IndexedDB.
- Library shows "On this device". Offline, the Android Library lists only books saved on the device. Profile links to Downloads.

### Checkpoint 7 — reader and Listen

**[SPIKE] result.** `@epubjs-react-native` expects an https URL and can fetch `epub.js`. A web epub.js rendition wants a browser DOM and remote assets, so it cannot read a file that must stay on the device with the network off. Both apps unzip the EPUB with JSZip and show the spine in order. The saved position is a spine CFI, `epubcfi(/6/{(index+1)*2})`, not a character offset. The same plain text feeds Listen.

- Web `/read/[id]`: table of contents, type size, cream and dark, percent, last position via `PUT /api/books/:id/progress`. Listen uses `speechSynthesis`, sentences of at most 180 characters. Pause is `cancel()` plus the saved sentence index. No voice means the Listen controls stay hidden.
- Android `read/[id]` opens at the saved spine CFI (the server row, or the on-device queue when the network is down). A failed save stays in `progress_queue` and is sent on the next open. `PUT /api/books/:id/progress` caps `updatedAt` at the server clock, so a device set to the future cannot block later saves.
- Listen: speed 0.75x to 2x, a voice control, previous and next sentence. Pause is `Speech.stop()` plus the chunk index. **Listen does not keep playing with the screen off.** That needs a foreground service and is out of this phase.
- Opening a book that is not on the device sends the reader back to the book page to download it. A download is checked by unzipping it before it is marked saved, so a bad file is not kept.
