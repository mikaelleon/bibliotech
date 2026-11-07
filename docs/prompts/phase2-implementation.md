# Phase 2 Implementation Prompt: Supabase, Verified Accounts, Offline Downloads, Reader, Listen, Catalog

> Paste this whole file into your coding agent at the repo root. Read `docs/phase2-preflight.md` first: it holds the verified Supabase setup steps, source rules and library facts this prompt relies on.
> Items marked **[CONFIRM]** depend on the official Week 8 brief or an instructor answer. Items marked **[SPIKE]** are unverified library behavior that must be tested before building on it. Record both in `docs/phase2-notes.md` instead of guessing silently.

---

## Current state (checked 2026-11-07)

Phase 1 is a working **prototype without a database**. Do not assume anything below exists unless this section says so.

| Area | State |
|---|---|
| Web app | Next.js 16 App Router in `web/src/app/`, helpers in `web/src/lib/`, `web/src/proxy.ts` (Next 16 name for middleware). No `web/src/app/api/` yet |
| Web auth and data | Custom session tokens (`web/src/lib/session.ts`, `session-token.ts`, `reset-token.ts`, `users.ts`, `records.ts`, `actions.ts`) backed by `web/data/users.json`, `library.json`, `favorites.json` |
| Android app | Expo SDK 58, React Native 0.88, expo-router. Session in `android/lib/session.tsx` using `expo-secure-store` directly |
| Supabase project | Created and linked: project `bibliotech`, ref `nsusvjlticyuxrshgusg`. Confirm email off, anonymous sign-ins off, sign-ups on (checked through `/auth/v1/settings`) |
| Migrations | `supabase/migrations/001_base_schema.sql` (profiles, books, downloads, favorites, sign-up trigger, RLS), `002_admin_and_library.sql`, `003_admin_support.sql`. Dry-run push passed; check `supabase migration list --remote` to see whether they are applied |
| Supabase client libraries | Not installed in either app |
| Anonymous sign-ins | Never used. Nothing to remove |
| CI | No `.github/workflows/` yet |
| Docker | Not installed on the dev machine, so `supabase start` is unavailable locally. CI runners have Docker |
| Env files | `web/.env.local` and `android/.env` exist and are git-ignored |

Design references in this repo: `design/tokens.md`, `docs/screens.md`, `docs/prompts/motion-and-empty-states.md`. Follow them for every new screen: no emojis, no decorative pills or badges, no three identical icon cards, no gradients, no excessive borders, titles without trailing periods, reduced-motion respected, 44px touch targets, empty and error states for every new list.

---

## 0. Goal and scope

Move the prototype onto Supabase, then make the rules from the exam brief **enforced by the backend**.

| In scope (Phase 2) | Out of scope (later) |
|---|---|
| Supabase Auth and data replace the JSON files on web and Android | Embedded AI agent (Phase 3) **[CONFIRM]** |
| Account tiers: Guest (unverified) and Registered (verified) | Wasmer production deployment (Phase 3) |
| Email verification flow | Ratings and reviews |
| Server-enforced download quota (5 / 10, distinct books) | Pre-generated audio files (device text-to-speech only) |
| Download = offline copy saved on the device | Social features, sharing |
| In-app reader that works offline | Payments |
| Listen (read aloud) with device text-to-speech | |
| "Already downloaded" dialog and Download history | |
| 200+ legal books imported with license metadata | |
| REST API used by both apps, documented | |
| Security hardening, tests, CI | |

Repo layout: `web/`, `android/`, `supabase/`, `design/`, `docs/`, plus new `scripts/` and `.github/workflows/`.

---

## 1. Locked product rules (do not reinterpret)

1. **Roles.** Visitor (no account, browse only), Guest, Registered, Admin.
2. **Guest = account with an unverified email.** The user signs up with email and password and gets a session immediately. Limit: **5 new distinct books per quota period**.
3. **Registered = same account after email verification.** Limit: **10 new distinct books per quota period** (not 5 plus 10). Verification upgrades in place and applies to the current period: a Guest who used 5 has 5 left after verifying. History, Library and Favorites carry over automatically.
4. **A download is a saved local copy** on that device, readable and listenable without internet.
5. **Quota counts distinct books per account per period**, across all devices. It is charged when the server issues the file URL for a book the account has never downloaded.
   - **Quota period:** monthly, anchored on the account's registration timestamp (`profiles.created_at`). A user who registered on the 14th at 09:30 gets a new period on the 14th of each month at 09:30. Months shorter than the anchor day clamp to their last day (registered Jan 31 renews Feb 28 or 29, then Mar 31).
   - `used` = books whose `first_downloaded_at` falls in the current period. Books first downloaded in earlier periods stay in history and re-download free; they never count again.
   - The API returns `periodStart` and `resetsAt` with every quota response, and the UI shows "Resets on {date}".
6. **Re-downloading a book already in the account's history is free** (new device, reinstall, cleared storage, or after removing it from the device). The user confirms through a dialog first.
7. **Removing the local copy never refunds quota.** Removing a book from the Library never removes download history.
8. **The reader and Listen open downloaded books only.** There is no online streaming path, so the quota gates all reading and listening.
9. **Admins cannot download, read, listen, or rate.** All download endpoints return 403 for admins. Admin UI stays web-only.
10. **The server is the only authority.** Hiding a button never counts as enforcement.

**[CONFIRM]** with the instructor that "Guest = signed up but unverified" satisfies the brief's Guest Mode. Visitors (no account) can still browse.

---

## 2. Audit first, then change

Before writing code, produce `docs/phase2-audit.md` (short, factual):

- Every file that reads or writes `web/data/*.json`, and every custom session or reset-token helper that Supabase Auth replaces. List the files and what replaces each.
- Every place that treats "Add to Library" as a download, or records a download from the client.
- Android: every use of `expo-secure-store` for the session, and every screen that reads local mock data.
- The schema in `001`–`003` versus what the screens use (column names, nullable fields).
- Admin functions that read `downloads` (`admin_stats`, `admin_list_users`, `admin_list_downloads`) and will change shape.
- Anything in the Phase 1 UI that conflicts with section 1.

Where the audit contradicts this prompt, follow this prompt and note the change in `docs/phase2-notes.md`.

---

## 3. Step 0: Supabase foundation

Do this before any Phase 2 feature. Exact commands and snippets are in `docs/phase2-preflight.md` section 2.

### 3.1 Keys and environment
- Use the new key types only. **Publishable key** (`sb_publishable_...`) in browser and app code. **Secret key** (`sb_secret_...`) in server code only. Do not use the legacy `anon` or `service_role` keys; they are deprecated by the end of 2026.
- Env names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM` (web); `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL` (Android). Add all of them to `.env.example` files. Never prefix the secret key with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`.

### 3.2 Migrations
- Apply `001`–`003` with `supabase db push --remote` if `supabase migration list --remote` shows them missing.
- Every new migration comes from `supabase migration new <name>` (timestamped). Do not hand-name `004_...`. Timestamped versions sort after `003`.
- Do not edit a migration after it has been pushed. Fix forward in a new one.

### 3.3 Web client
- Install `@supabase/supabase-js` and `@supabase/ssr`.
- `web/src/lib/supabase/client.ts` (`createBrowserClient`), `web/src/lib/supabase/server.ts` (`createServerClient` with `getAll`/`setAll` cookies, one client per request), `web/src/lib/supabase/admin.ts` (secret key, server only, `import "server-only"`).
- `web/src/proxy.ts` refreshes the session and must return the response built in `setAll`, or users get signed out at random. Keep the existing redirect logic.
- Protect server code with `supabase.auth.getClaims()`. Never trust `getSession()` on the server.
- Replace the JSON-file auth, library and favorites code with Supabase. Delete `web/data/*.json` and the custom token helpers once nothing imports them. Password reset uses Supabase's reset flow.

### 3.4 Android client
- Install with `npx expo install @supabase/supabase-js @react-native-async-storage/async-storage expo-secure-store`, plus `aes-js` and `react-native-get-random-values`.
- SecureStore rejects values over 2048 bytes and a Supabase session is larger. Use the `LargeSecureStore` adapter from the Supabase Expo tutorial (AES key in SecureStore, ciphertext in AsyncStorage). Client options: `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`.
- Register one `AppState` listener: `startAutoRefresh()` when active, `stopAutoRefresh()` otherwise.
- Rewrite `android/lib/session.tsx` on top of this client.

### 3.5 Auth settings and email
- Confirm email stays **off** on the hosted project, and `[auth.email] enable_confirmations = false` in `supabase/config.toml`. With it off, Supabase sets `auth.users.email_confirmed_at` at signup, so that field means nothing. **`profiles.email_verified_at` is the only source of truth.**
- **[SPIKE]** Confirm that `signUp` returns a session immediately with confirmations off.
- **Custom SMTP is required.** The built-in sender delivers only to project team members, 2 emails per hour. Configure Resend SMTP in Auth > SMTP (used by password reset), then raise the email rate limit in Auth > Rate Limits.
- Add the production web URL and the Expo redirect scheme to Auth > URL Configuration when they exist.

### 3.6 First admin
Sign up through the app, then promote that account with the statement in `supabase/dev-seed.sql`. Document this in the README.

**Checkpoint 0 is done when** both apps sign up, sign in, sign out and reset passwords through Supabase, Library and Favorites read and write Supabase, and no JSON store remains.

---

## 4. Database (new migration from `supabase migration new phase2`)

Apply cleanly on top of `001`–`003`. Put a rollback note in the file header.

SQL rules for every object in this phase:
- Every new table: `enable row level security`, then `revoke all ... from anon, authenticated`, then grant back only what clients need. Policies never remove grants.
- Every `security definer` function: `set search_path = ''` and schema-qualified names (`public.profiles`, `auth.uid()`). Revoke execute from `public, anon` and grant only to the role that needs it.
- Fix the leftovers from `002`/`003`: revoke the default `anon` grant on `library_items`, and recreate `is_admin()` and the admin functions with `search_path = ''`.

### 4.1 profiles
- Add `email_verified_at timestamptz null`.
- Derived tier (SQL function `public.account_tier(uid)`): `admin` if role is admin, else `registered` if `email_verified_at is not null`, else `guest`.
- Limits live in one place: a `quota_limits` table or SQL function (`guest = 5`, `registered = 10`). Do not hard-code the numbers in three layers.
- Period in one place: `public.quota_period(p_anchor timestamptz, p_now timestamptz)` returns `(period_start, period_end)`, where `period_start = p_anchor + n months` for the largest `n` with `period_start <= p_now`, and `period_end = p_anchor + (n + 1) months`. Use month arithmetic from the anchor each time (not from the previous period) so day clamping never drifts.
- Clients must not write `email_verified_at` or `role`. `001` grants clients `update (display_name)` only; keep it that way and add a test proving both columns are rejected.

### 4.2 downloads (one row per user and book)
`001` created `downloads(id, user_id null, book_id, created_at)`. Reshape it, deduplicating by (user, book) and dropping rows with a null `user_id`:

```
downloads(
  id uuid pk,
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete restrict,
  first_downloaded_at timestamptz not null default now(),
  last_downloaded_at  timestamptz not null default now(),
  times_downloaded    int not null default 1,
  last_device_label   text,
  unique (user_id, book_id)
)
```
RLS: users `select` their own rows. **No client insert, update, or delete.** All writes go through the function below.

### 4.3 books (file and license fields)
`001` already has `license`, `source_name`, `source_url`, `language`, `published`, `cover_url`. Add: `file_path`, `file_format` (`epub`), `file_size_bytes`, `source` (`gutenberg | standard_ebooks | other`), `source_id`, `attribution`. Unique on (`source`, `source_id`) for importer idempotency. A book with no `file_path` is not downloadable and the UI must say so.

### 4.4 reading_progress
`(user_id, book_id, location text, percent numeric, updated_at)`, unique on (user_id, book_id), RLS own rows only.

### 4.5 email_verifications
`(id, user_id, token_hash, expires_at, used_at, created_at)`. Store only the SHA-256 hash of the token. No client grants at all; the server uses the secret key.

### 4.6 `public.request_download(p_user uuid, p_book uuid, p_device text, p_confirm_repeat boolean)`
`security definer`, `search_path = ''`, execute granted to `service_role` only (the secret key acts as `service_role`). One transaction:

1. `pg_advisory_xact_lock` keyed on the user id so parallel requests serialize.
2. Reject if the user is admin (`forbidden`).
3. Reject if the book has no `file_path` (`not_available`).
4. If a `downloads` row exists for (user, book):
   - and `p_confirm_repeat` is false: return `already_downloaded` with `last_downloaded_at` and **change nothing**.
   - and true: update `last_downloaded_at`, `times_downloaded + 1`, `last_device_label`. Return `repeat_ok`. **No quota use.**
5. Otherwise count the user's rows with `first_downloaded_at` in the current `quota_period`. If `count >= limit_for(tier)`, return `quota_exceeded` with `used`, `limit`, `tier`, `resets_at`.
6. Otherwise insert the row and return `ok` with `used`, `limit`, `resets_at`.

The API creates the signed URL only after `ok` or `repeat_ok`.

### 4.7 Admin function updates
Adjust `admin_stats`, `admin_list_downloads` and analytics for the new shape: total distinct downloads, repeat downloads (`sum(times_downloaded - 1)`), downloads per day by `first_downloaded_at`, top books. Replace the `is_anonymous` guest counts with tier counts. `admin_list_users` gains `tier` and `email_verified_at`. Keep the `is_admin()` checks and the last-admin safeguards.

### 4.8 Storage
Private bucket `books`, created in the migration or `config.toml` (`public = false`, `file_size_limit = "50MiB"`, `allowed_mime_types = ["application/epub+zip"]`). No storage policies for `anon` or `authenticated`; only the server signs URLs.

---

## 5. Email verification

- `POST /api/auth/send-verification` (auth required): create a random 32-byte token, store its hash with a 24 hour expiry, send the link through the Resend API (`RESEND_API_KEY`, `EMAIL_FROM`). Cooldown 60 seconds per user, max 5 per day.
- `GET /api/auth/verify?token=...`: hash, look up, check expiry and unused, set `email_verified_at`, mark used, redirect to a web "Email verified" screen. Invalid or expired tokens show a clear error with a resend action.
- Changing a user's email clears `email_verified_at` and downgrades the tier. Downloads already made stay.
- Signup rate limiting by IP and by email. Reject disposable email domains using a small blocklist file in `web/src/lib/`.
- Android: the link opens the web verify page. When the app returns to the foreground it refetches `GET /api/me`. A deep link can come later.
- Dev fallback: when `RESEND_API_KEY` is missing, log the link to the server console, only when `NODE_ENV !== 'production'`.

UI (both platforms):
- Guest sees a quiet inline banner on Home and Profile: "Verify your email to raise your limit from 5 to 10 downloads" with a Send link action. No modal on launch.
- Profile shows tier, verified state, `used / limit`.
- Guest at limit: "You've used all 5 downloads this month. Verify your email to unlock 5 more." Registered at limit: "You've used all 10 downloads this month. They reset on {date}." No upgrade button.
- Quota text everywhere shows the reset date: "4 of 5 downloads used. Resets on Dec 14."

---

## 6. REST API

Next.js route handlers under `web/src/app/api/`. Android calls the same endpoints with `Authorization: Bearer <access_token>`.

Auth on every handler:
- Web requests: the server client from cookies, then `getClaims()`.
- Bearer requests: `supabase.auth.getClaims(token)` (or `getUser(token)` when a fresh user record is needed). **[SPIKE]** confirm the `getClaims(jwt)` form on the first route.
- Never accept a user id from the request body. Privileged writes use the secret-key client after the caller is verified.

Common rules: zod validation on all inputs, uniform error shape `{ "error": { "code": "...", "message": "..." } }`, correct status codes, pagination (`page`, `pageSize` max 50), rate limits per user and IP on auth, verification and download routes. CORS limited to the web origin; the Android app is not a browser and needs no CORS.

| Method and path | Purpose |
|---|---|
| `GET /api/me` | tier, verified, role, `used`, `limit`, `periodStart`, `resetsAt` |
| `GET /api/books` | list and search: `q`, `category`, `author`, `sort`, `page` |
| `GET /api/books/:id` | details plus `downloaded` (in this user's history) |
| `POST /api/books/:id/download` | body `{ deviceLabel, confirmRepeat? }`. Returns `{ url, expiresIn, used, limit }` or errors below |
| `GET /api/downloads` | the user's download history |
| `PUT /api/library/:bookId`, `DELETE ...` | set-based Library membership (no quota effect) |
| `PUT /api/favorites/:bookId`, `DELETE ...` | set-based favorites |
| `GET/PUT /api/books/:id/progress` | reading progress sync |
| `POST /api/auth/send-verification`, `GET /api/auth/verify` | section 5 |
| Admin routes | every handler checks admin server-side |

Download endpoint responses:
- `200` with a signed URL from `storage.from('books').createSignedUrl(path, 60)`. Signed URLs cannot be revoked, so keep the 60 second lifetime.
- `409 ALREADY_DOWNLOADED` with `lastDownloadedAt` when `confirmRepeat` is not set. Nothing changes.
- `403 QUOTA_EXCEEDED` with `used`, `limit`, `tier`, `resetsAt`.
- `403 FORBIDDEN_ROLE` for admins.
- `404 BOOK_NOT_AVAILABLE` when there is no file.
- `429` when rate limited.

Write `docs/api.md` with every endpoint, example request and response, and error codes. Keep it in sync with the code.

---

## 7. Offline downloads

### 7.1 Web (PWA)
- Manifest in `web/src/app/manifest.ts`. Service worker either hand-written (`public/sw.js`, registered from a client component) or Serwist. Do not use `next-pwa`. It caches the **app shell only** (routes, fonts, icons); book files never go in the service worker cache.
- Store books in **IndexedDB** with `idb` v8: object store `books` holds `{ bookId, meta, fileBlob, savedAt, size }`; store `progress_queue` holds unsynced progress. Do not `await` unrelated work inside an `idb` transaction.
- Call `navigator.storage.persist()` after the first download and show used and available space from `navigator.storage.estimate()`.
- Offline detection: `navigator.onLine` plus `online` and `offline` events, and a failed fetch also flips to offline.
- Browsers may evict storage. An evicted book shows as "Downloaded before" and can be re-downloaded free. Document this.
- Library and Downloads load from local data when offline.

### 7.2 Android (Expo SDK 58)
- Use the current `expo-file-system` API, not the legacy one:
  ```ts
  import { File, Directory, Paths } from 'expo-file-system';
  const dir = new Directory(Paths.document, 'books');
  dir.create(); // guard if it exists
  const task = File.createDownloadTask(url, new File(dir, `${bookId}.epub`), {
    onProgress: ({ bytesWritten, totalBytes }) => { /* update UI */ },
  });
  const file = await task.downloadAsync();
  ```
  `pauseAsync()`, `resumeAsync()` and `savable()` support resume. `documentDirectory` and `createDownloadResumable` exist only in `expo-file-system/legacy`; don't use them.
- A local manifest (`expo-sqlite`, `openDatabaseAsync` or `SQLiteProvider` with migrations in `onInit`) records `bookId`, path, size, `savedAt` and a metadata snapshot so the Library renders offline.
- Offline detection with `expo-network`: use `useNetworkState().isInternetReachable`, not `isConnected`.
- Handle low storage, interrupted downloads (resume or delete the partial file), and a file missing on disk (treat as not downloaded on this device).

### 7.3 Shared behavior
Every book has one of three states on a device:

| State | Primary action |
|---|---|
| Not downloaded (never in history) | Download |
| Downloaded on this device | Read and Listen, plus Remove from device |
| Downloaded before, not on this device | Download again (opens the dialog in 8.2) |

Flow: user taps Download, the app calls `POST /api/books/:id/download`, receives the signed URL, fetches the file, checks size and that it opens as an EPUB, saves it, updates the local manifest, then refreshes quota from the response. If saving fails after the server charged quota, the user can retry free (the book is now in history). Say so in the error message.

Offline rules: Read and Listen work. Search, quota and Favorites changes need the network; sync queues until online. Show a calm offline notice on screens that need the network. No spinners that never resolve. Reading progress writes to the local queue and flushes when online (last write wins by `updated_at`).

---

## 8. Screens and copy

Build on the existing components (`PageHeader`, `Banner`, `Dialog`, `Toast`, `ErrorPanel`, `DataTable`). Same screens on web and Android.

### 8.1 Book detail
Shows the three states from 7.3, a source line ("Public domain. Source: Project Gutenberg"), file size, and quota text near the action: "4 of 5 downloads used". The Download button shows inline progress, then becomes Read.

### 8.2 Already downloaded dialog
Title: `You already downloaded this book`
Body: `You saved it on {date}. Downloading it again to this device doesn't use any of your downloads.`
Actions: `Download again` (primary), `Cancel`.
Triggered by `409 ALREADY_DOWNLOADED`; the client then retries with `confirmRepeat: true`.

### 8.3 Quota reached
A dialog or inline panel, not a blocking page. Copy depends on tier (section 5). Links to Downloads.

### 8.4 Downloads (history)
Reachable from Profile and the Library header. Lists every book in the user's history with first download date, times downloaded, and device status. Per row: Read (if on device), Download again, Remove from device. Header shows `used / limit`. Empty state: "Nothing downloaded yet" with a Browse action. Guests see this screen too.

### 8.5 Library
Saved plus downloaded books. Favorites stay separate. A quiet text indicator "On this device" for offline books (no badge). Offline, the Library shows only books on this device.

### 8.6 Reader
- Opens only local files. If the book is not on this device, show the download action instead.
- **[SPIKE] first (see build order step 7):**
  - Android: can `@epubjs-react-native/core` (with `@epubjs-react-native/expo-file-system`, `react-native-webview`, `react-native-gesture-handler`) open a local `file://` EPUB or base64 with the network off? Its README only shows https URLs and doesn't say whether epub.js is bundled. If it fails offline, fall back to `react-native-webview` loading epub.js and JSZip **bundled in the app assets**.
  - These are native modules, so expect a **development build** (`expo run:android` or EAS), not Expo Go.
  - Web: can epub.js (v0.3, JSZip loaded first) open the EPUB from an ArrayBuffer or Blob read out of IndexedDB?
- Features: table of contents, previous and next, font size, line spacing, theme (cream default plus one dark option from the tokens), position saved and restored as a CFI, progress percent.
- Chrome auto-hides while reading. Respect safe areas. Restrained transitions per the motion doc.

### 8.7 Listen (read aloud)
- Device text-to-speech only: `expo-speech` on Android, `window.speechSynthesis` on web. No audio files, no external TTS service.
- **Text source:** neither reader library exposes chapter text. Unzip the local EPUB (JSZip), read the current section's XHTML, strip markup to plain text, split into sentences. This is part of the reader spike.
- Chunk by sentence. On Android keep every chunk under `Speech.maxSpeechInputLength` (read it at runtime; the Android value is not documented). Chrome cuts off long utterances, so chunking is required on web too.
- **Pause on Android:** `Speech.pause()` and `Speech.resume()` are not available on Android (iOS and web only). Implement pause as `Speech.stop()` plus the saved chunk index, and resume by speaking from that chunk. On web, `speechSynthesis.pause()`/`resume()` work, but the same chunk-index approach keeps both platforms identical.
- Voices: `Speech.getAvailableVoicesAsync()` on Android; on web, `speechSynthesis.getVoices()` loads asynchronously, so fill the picker on `voiceschanged`.
- Controls: play and pause, previous and next sentence, speed 0.75x to 2x, voice picker. Subtle highlight of the current sentence while the reader is visible. The Listen position follows the reader position.
- Android speech may stop when the app is backgrounded. Don't claim background playback; note the limit in `docs/phase2-notes.md`.
- If no voices are available, hide Listen and explain once in plain words.

### 8.8 Storage settings (Profile)
Downloaded books on this device with sizes, per-book Remove, and Remove all (with confirmation). Total used. Copy says removing frees space and does not refund downloads.

### 8.9 Auth and verification screens
Sign up, log in, verify-email banner and result screen, resend with cooldown, password reset through Supabase. Errors never reveal whether an email exists.

Add every new state to `/dev/states` (web): downloading, failed, quota reached, already downloaded dialog, offline, empty Downloads.

---

## 9. Catalog import (200+ unique, legal)

`scripts/import-books/` (Node + TypeScript). Runs on the developer's machine with `SUPABASE_SECRET_KEY` from an env file, never in the apps.

### 9.1 Sources
- **Metadata: Gutendex** (`https://gutendex.com/books`). Query `languages=en&copyright=false&mime_type=application/epub`, page through `next` (32 results per page). Use `authors[].death_year`, `subjects`, `bookshelves`, `summaries`, `download_count`. The public instance asks heavy users to self-host; one import of about 10 pages is light use.
- **Files: Project Gutenberg, through the allowed routes only.** PG's robot policy says the site is for human users and blocks automated access, except the `robot/harvest` endpoint and mirrors. Fetch EPUBs through `https://www.gutenberg.org/robot/harvest?filetypes[]=epub.images&langs[]=en` (or `epub.noimages`) or a listed mirror, with **at least 2 seconds between requests**. Do not loop over `gutenberg.org/ebooks/<id>.epub3.images` links from Gutendex.
- **PG license rules:** keep every EPUB byte-for-byte unmodified, including its PG header and license. Don't put "Project Gutenberg" in titles, promotion or cover art; a plain acknowledgement with a link ("Source: Project Gutenberg") is fine. Distribution is free, so the royalty clauses don't apply. Check the license inside each EPUB, because the catalog can be wrong.
- **Standard Ebooks: no automation.** Bulk downloads and OPDS feeds are Patrons Circle only, and the site has a hidden honeypot link that bans IPs for 24 hours. At most a short hand-picked list in `scripts/data/standard-ebooks.txt`, downloaded by hand. **[CONFIRM]** single-book downloads are free without an account before relying on it. CC0 covers their own work only; credit cover art separately.
- **OpenStax: dropped.** EPUB availability and per-title licenses could not be verified, and the reader is EPUB-only. Fill Science and Business from Gutenberg (Darwin, Faraday, Huxley, Adam Smith, Taylor, and similar).
- Only works marked `copyright=false` (public domain in the US). Reject borrow-only copies (Open Library or Internet Archive lending). Never import from piracy sites.

### 9.2 Size budget (Supabase free tier)
- Storage is **1 GB**, so 220 books must average under about 4.5 MB. Cap each file at 5 MB: prefer `epub.images`, fall back to `epub.noimages` when the images edition is over the cap, skip the book if both are.
- Egress is 5 GB per month; each demo download counts.
- Report total bytes in `docs/catalog-report.md`.

### 9.3 Behavior
- Idempotent on (`source`, `source_id`): re-running updates, never duplicates. Supports `--dry-run`, `--limit`, `--source`.
- Deduplicate on normalized title plus author. One book counts once toward the 200.
- Map to a fixed category list (Fiction, Classics, Philosophy, History, Science, Technology, Business, Poetry, Children, others as needed), from Gutendex `bookshelves` and `subjects`. Every category gets at least a handful. Update `CATEGORIES` in `web/src/lib/types.ts` and the Android equivalent to match.
- Upload to the **private** bucket `books` at `<source>/<sourceId>.epub`. Fill `file_path`, `file_size_bytes`, `license`, `attribution`, `source_url`.
- Validate each EPUB (zip opens, `META-INF/container.xml` present). Log failures and skip them.
- Target at least 220 so 200+ survive validation. Write `docs/catalog-report.md` with counts per category, failures, total size and the license summary.
- Covers: use the PG cover only if it is part of the public-domain work. Otherwise keep the typographic placeholder from the design system.

---

## 10. Security checklist

- Bucket `books` is private. Files are reachable only through 60-second signed URLs minted after `request_download` succeeds.
- The secret key exists only in server env vars. Apps get only the publishable key. A secret key used from a browser returns 401; treat any leak as an incident and rotate.
- RLS on every table, explicit revokes on every table, `search_path = ''` on every security definer function. Tests prove a user cannot read or write another user's rows, cannot write `role` or `email_verified_at`, and cannot insert into `downloads`.
- zod validation, rate limits, secure headers and a basic CSP on web, CORS limited to the web origin, no stack traces in responses.
- Verification tokens are random, hashed at rest, expiring and single-use.
- Passwords handled only by Supabase Auth. Never log tokens, verification links in production, or personal data.
- `npm audit` for both apps, results in `docs/security.md` with one paragraph on threats and mitigations (guest abuse, token theft, quota races, scraping).
- Accepted risk: a saved public-domain file cannot be revoked.

---

## 11. Testing and CI

Tests live next to the code. Vitest for web logic and the importer; Jest (jest-expo) for Android logic. SQL and API tests run against a local Supabase stack (`supabase start`, `supabase db reset`), which needs Docker: install Docker Desktop for local runs, and CI runners have it. **Never point tests at the hosted project.**

**Must-have tests**
1. Guest can download 5 distinct books; the 6th returns `QUOTA_EXCEEDED`.
2. After verification, the same account can reach 10 in the period; the 11th is blocked.
2a. Quota period: `quota_period` returns the right window for mid-month, end-of-month (Jan 31 anchor through Feb and Mar), leap-year and exact-boundary timestamps. A download in the previous period does not count toward `used`; a new period allows new books again; a book from an earlier period re-downloads free.
3. A book already in history without `confirmRepeat` returns `409` and changes nothing.
4. The same request with `confirmRepeat` succeeds, increments `times_downloaded`, and leaves `used` unchanged.
5. Concurrency: with 4 of 5 used, 10 parallel requests for 10 different books produce exactly one success.
6. Admin gets 403 on download.
7. Verification: a valid token verifies; expired, reused and tampered tokens fail; the resend cooldown works; changing email clears the verified state.
8. RLS and grants: cross-user reads and forbidden writes are rejected, including `role`, `email_verified_at`, direct `downloads` inserts, and `anon` access to `library_items`.
9. Importer: dedupe and idempotency (run twice, same count).
10. Client logic: manifest state machine (not downloaded, downloaded here, downloaded before), the progress queue flush, and Listen chunking plus pause/resume by chunk index.

**Manual device checks** (results in `docs/phase2-notes.md`): airplane mode on Android and the web PWA with a downloaded book open, reading and listening; storage full; interrupted download; two devices on one account.

**CI** (`.github/workflows/ci.yml`, new): lint, typecheck, tests (with `supabase start` in the job), web build, Expo type check, Docker build for `web/`. Fail on any step. Store no keys in the workflow; local-stack keys come from `supabase status`.

---

## 12. Documentation to update

- `README.md` (repo root, new): Supabase setup (link to `docs/phase2-preflight.md`), env vars, running web and Android (dev build and EAS preview APK), first admin, importer, tests.
- `docs/architecture.md`: tier model, why `email_verified_at` is the source of truth, download flow diagram (mermaid), offline storage model.
- `docs/database.md`: every new table, function and grant.
- `docs/api.md`, `docs/security.md`, `docs/catalog-report.md`, `docs/phase2-notes.md`.
- `docs/screens.md`: Guest and Registered definitions, admin restrictions, new screens.
- Remove text that describes the JSON-file prototype once it is gone.

---

## 13. Build order (checkpoints)

0. **Supabase foundation (section 3):** push `001`–`003`, install clients, move web and Android auth, Library and Favorites to Supabase, delete the JSON store.
1. Audit doc, then the Phase 2 migration with tests for `request_download`, grants and RLS (needs Docker or CI).
2. Verification flow, custom SMTP, tier display, banner and profile.
3. Download endpoint, signed URLs, rate limits, `docs/api.md`.
4. Importer with a first batch of 30 books so later steps use real files. Finish 200+ before the end of the phase.
5. Android download manager plus manifest, then web IndexedDB plus PWA shell.
6. Dialogs, Downloads screen, quota states, storage settings.
7. **Reader spike** (section 8.6 and 8.7 text extraction), on an Android dev build and the web PWA, network off. Record the result, then build the Reader and Listen.
8. Admin function updates and dashboard numbers.
9. Offline pass, security pass, CI green, docs.

Commit at each checkpoint with a clear message. Do not mix migrations and UI in one commit.

---

## 14. Acceptance checklist

- [ ] Web and Android sign up, sign in and reset passwords through Supabase. No JSON store or custom session token code remains.
- [ ] A new user signs up and has a working session as a Guest with `0 / 5`.
- [ ] Guest downloads 5 books; the 6th is refused by the **server** (verify by calling the API directly).
- [ ] Verifying the email changes the same account to Registered `5 / 10` with history intact.
- [ ] Quota resets monthly on the registration anniversary, and the UI shows the reset date.
- [ ] Re-downloading a known book shows the dialog, succeeds, and leaves the count unchanged.
- [ ] Removing a book from the device does not change the count; downloading it again is free.
- [ ] A downloaded book opens and reads in airplane mode on Android and in the web PWA.
- [ ] Listen reads aloud offline with working play, pause (stop and resume by sentence on Android), skip and speed.
- [ ] Reading position and progress survive restarts and sync after reconnecting.
- [ ] Download history lists everything with correct dates and device status.
- [ ] Admin cannot download or read, and the dashboard shows correct download totals.
- [ ] 200+ unique books in the catalog, each with license and source, files in the private bucket, total under the 1 GB free-tier storage.
- [ ] RLS, grants, quota, concurrency and verification tests pass in CI.
- [ ] New screens follow the design system and motion rules, with empty and error states.
- [ ] Docs updated; `docs/phase2-notes.md` lists every **[CONFIRM]**, every **[SPIKE]** result, and every deviation.

## 15. Phase 2 demo script

Before the demo: free Supabase projects pause after a week of inactivity. Open the dashboard or call the API the day before.

1. Sign up as a Guest, show `0 / 5`, download two books.
2. Open a downloaded book with the network off, read a page, then press Listen.
3. Download a book already in history to show the dialog and the unchanged count.
4. Use up the quota, show the server refusal and the verify prompt.
5. Verify the email, show `5 / 10` on the same account.
6. Show Downloads history and storage settings.
7. Switch to the admin account on the web and show the dashboard updating.
8. Show the API docs and the green CI run.
