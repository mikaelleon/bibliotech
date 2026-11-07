# Phase 2 preflight: verified sources, Supabase setup, prompt corrections

Checked 2026-11-07 against the live docs and APIs listed at the end. Read this before running the Phase 2 prompt. Items marked **unverified** could not be confirmed from the source and need a quick spike or a manual check.

## 1. Repo reality vs the Phase 2 prompt

The prompt says "Supabase schema already exists. Extend it." That is not true today.

| Prompt assumes | Repo actually has |
|---|---|
| Live Supabase project and schema | None. `docs/database.md`: "Phase 1 has no live database." Accounts live in `web/data/users.json`, library and favorites in JSON files |
| Base tables `profiles`, `books`, `downloads`, `favorites` | Not created anywhere. `002` and `003` only `alter` them. There is no `001` |
| Supabase anonymous sign-ins to remove | No Supabase client at all. Web auth is custom (`web/src/lib/session.ts`, `session-token.ts`, `reset-token.ts`) |
| `@supabase/supabase-js` installed | Not in `web/package.json` or `android/package.json` |
| Routes under `web/app/api/`, helpers in `web/lib/` | App lives in `web/src/app/` and `web/src/lib/` |
| Migration `004_phase2.sql` | CLI expects `<timestamp>_<name>.sql` from `supabase migration new` |
| "service role key" / "anon key" | New keys: `sb_publishable_...` (client) and `sb_secret_...` (server). Legacy JWT keys are deprecated by end of 2026 |

So Phase 2 needs a **step 0: stand up Supabase and move auth onto it** before checkpoint 1 of the prompt.

## 2. Supabase setup, step by step

### 2.1 Project and keys
1. Create a project in the Supabase dashboard (free plan allows 2 active projects).
2. Settings > API Keys: copy the project URL, the **publishable** key and a **secret** key.
3. Env files (never commit them; add names to `.env.example`):

```bash
# web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...        # server only, never NEXT_PUBLIC_
RESEND_API_KEY=...                        # own verification emails
APP_URL=http://localhost:3000

# android/.env
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
EXPO_PUBLIC_API_URL=http://<lan-ip>:3000
```

A secret key used from a browser returns 401, so a leak shows up fast in testing, but still treat it as a password.

### 2.2 CLI and local stack (Windows)
1. Install Docker Desktop (needed for `supabase start`).
2. Install the CLI, either globally:
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```
   or per project: `npm install supabase --save-dev`, then `npx supabase ...` (Node 20+).
3. From the repo root:
   ```bash
   supabase init        # creates supabase/config.toml, keeps existing migrations folder
   supabase start       # local Postgres, Auth, Storage, Mailpit at http://127.0.0.1:54324
   supabase login
   supabase link --project-ref <ref>
   ```

### 2.3 Migrations
1. Rename existing files to the CLI pattern so order is kept, for example `20261101000001_base_schema.sql` (new), `20261101000002_admin_and_library.sql`, `20261101000003_admin_support.sql`.
2. Write the missing base schema (`profiles`, `books`, `downloads`, `favorites`, `profiles` insert trigger on `auth.users`). `002` depends on it.
3. New migrations: `supabase migration new phase2`.
4. Apply locally with `supabase db reset` (also runs seed). Deploy with `supabase db push`.
5. Seed file goes in `supabase/seed.sql` (`[db.seed] sql_paths = ["./seed.sql"]`). Move the useful parts of `dev-seed.sql` there.

SQL rules from the docs:
- New `public` tables get full grants for `anon` and `authenticated` by default. Policies do not remove grants. Every table needs explicit `revoke` and `grant` plus RLS.
- `security definer` functions: `set search_path = ''` and schema-qualify every name (`public.profiles`). Existing `002` uses `search_path = public`; tighten it.
- Column-level privileges (`revoke update (role, email_verified_at) on public.profiles from authenticated`) are supported, but **unverified** in this pass; add the test the prompt asks for.

### 2.4 Auth settings
| Setting | Hosted location | `config.toml` | Value |
|---|---|---|---|
| Confirm email | Auth > Providers > Email > Confirm Email | `[auth.email] enable_confirmations` | **off** |
| Anonymous sign-ins | Auth > Providers > Allow anonymous sign-ins | `[auth] enable_anonymous_sign_ins` | **off** |
| Site URL, redirects | Auth > URL Configuration | `auth.site_url`, `auth.additional_redirect_urls` | app URL, Expo scheme |
| Rate limits | Auth > Rate Limits | | raise after SMTP is set |

With confirmations off, the docs say the email is "implicitly confirmed", so `auth.users.email_confirmed_at` is set at signup and means nothing. `profiles.email_verified_at` is the only source of truth. Whether `signUp` returns a session immediately in that mode is **unverified**; check it once on the local stack.

### 2.5 Email (SMTP)
- Built-in sender: 2 emails per hour, and it only delivers to the project's team members. Not usable for real users, including password reset.
- Set custom SMTP (Auth > SMTP), Resend is listed as a supported provider. Default limit becomes 30 per hour; raise it in Rate Limits.
- The app's own verification link can go out through the Resend API directly; password reset still uses Supabase's SMTP.
- Locally, all mail lands in Mailpit.

### 2.6 Storage
```toml
[storage.buckets.books]
public = false
file_size_limit = "50MiB"
allowed_mime_types = ["application/epub+zip"]
```
Signed URL: `supabase.storage.from('books').createSignedUrl(path, 60)`. A signed URL cannot be revoked before it expires, so keep it short (60 s is fine).

### 2.7 Web client (Next.js 16)
```bash
npm install @supabase/supabase-js @supabase/ssr
```
- `src/lib/supabase/client.ts` with `createBrowserClient(url, publishableKey)`.
- `src/lib/supabase/server.ts` with `createServerClient(url, publishableKey, { cookies: { getAll, setAll } })`, one per request.
- `src/proxy.ts` (Next 16 name for middleware) refreshes the session and must return the response built in `setAll`, or users get signed out at random.
- Protect server code with `supabase.auth.getClaims()`, never `getSession()`.
- Exact helper code: copy from the Next.js SSR guide when implementing. The extract did not include the full code blocks.

### 2.8 Expo client (SDK 58)
```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage expo-secure-store
npm install aes-js react-native-get-random-values
npm install -D @types/aes-js
```
- SecureStore rejects values over 2048 bytes. A Supabase session is larger, so use the `LargeSecureStore` class from the Supabase Expo tutorial (AES key in SecureStore, ciphertext in AsyncStorage). Current `android/lib/session.tsx` stores sessions in SecureStore directly; check it against this limit.
- Client options: `storage: new LargeSecureStore()`, `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`.
- Register once: `AppState` listener calling `supabase.auth.startAutoRefresh()` on `active`, `stopAutoRefresh()` otherwise.

### 2.9 Bearer tokens from the Android app
API routes read `Authorization: Bearer <access_token>` and verify with `supabase.auth.getClaims(token)` (or `getUser(token)` when a fresh user record is needed). Never accept a user id from the body. The `getClaims(jwt)` form is inferred from the reference, so confirm it on the first route.

### 2.10 Free tier limits that affect this project
| Limit | Free | Impact |
|---|---|---|
| File storage | 1 GB | 220 EPUBs must average under ~4.5 MB. Image-heavy Gutenberg EPUBs can be larger |
| Egress | 5 GB / month | Each demo download counts |
| Max upload | 50 MB | Skip anything bigger |
| Database | 500 MB | Fine |
| Pausing | after 1 week inactive | Open the dashboard or hit the API before the demo |

## 3. Book sources, verified

### 3.1 Gutendex (metadata)
- `GET https://gutendex.com/books` returns `{ count, next, previous, results }`, up to 32 books per page. `page` works (used in `next`) but is not documented.
- Filters: `languages=en`, `copyright=false` (public domain in the US), `mime_type=application/epub` (prefix match), `topic`, `search`, `ids`, `sort=popular|ascending|descending`, `author_year_start/end`.
- Book fields: `id`, `title`, `authors[{name, birth_year, death_year}]`, `translators`, `editors` (not in docs), `subjects`, `bookshelves`, `languages`, `copyright`, `summaries`, `media_type`, `formats` (MIME to URL), `download_count`.
- EPUB link shape: `formats["application/epub+zip"] = https://www.gutenberg.org/ebooks/<id>.epub3.images`. Cover: `formats["image/jpeg"]`.
- Live count for that query: 61,521. 220 is easy.
- The public instance asks long-term users to self-host. A one-off import of about 10 pages is light use.

### 3.2 Project Gutenberg (files)
- Robot policy: the site "is intended for human users only". Automated access can get the IP blocked. The allowed routes are the `robot/harvest` endpoint (example uses `wget -w 2`, file types include `epub.images`, `epub.noimages`) and private mirrors.
- **Importer change:** pick books with Gutendex, but fetch files through the harvest route or a listed mirror, 2 s apart. Do not loop over `gutenberg.org/ebooks/<id>.epub3.images`.
- License: keep each EPUB unmodified with its PG header and license. Don't use "Project Gutenberg" in titles, promotion or covers. A plain acknowledgement with a link ("Source: Project Gutenberg") is fine. Free distribution avoids the royalty clauses. Check the license inside each EPUB, since the catalog can be wrong.

### 3.3 Standard Ebooks
- CC0 for content they produce. Third-party material on the site (for example some cover art) may not be.
- OPDS feeds and bulk downloads are Patrons Circle only. Only the New Releases feed is open.
- The site has a hidden `/honeypot` link that bans the IP for 24 hours. Any scraper that follows hidden links gets banned.
- Whether single-book downloads are free without an account is **unverified**.
- **Recommendation:** drop it from automation. At most a short manual list.

### 3.4 OpenStax
- **Unverified.** The site renders client-side and could not be read. EPUB availability and per-title licenses (CC BY vs CC BY-NC-SA) are unknown.
- The reader is EPUB-only. If OpenStax only offers PDF, it does not fit.
- **Recommendation:** fill Science and Business from Gutenberg (Darwin, Faraday, Adam Smith, and others) and drop OpenStax unless someone confirms EPUB plus a license by hand.

## 4. Client libraries, verified

| Prompt says | Correct for SDK 58 / current libs |
|---|---|
| `FileSystem.documentDirectory` + `createDownloadResumable` | Legacy only (`expo-file-system/legacy`). New API: `File.createDownloadTask(url, new File(Paths.document, 'books', id + '.epub'), { onProgress })`, then `task.downloadAsync()`, with `pauseAsync`, `resumeAsync`, `savable()` for resume. Progress fields `{ bytesWritten, totalBytes }` |
| Listen has play and pause on Android | `Speech.pause()` and `resume()` are **not available on Android** (iOS and web only). Implement pause as `Speech.stop()` plus a saved chunk index, and resume by speaking from that chunk |
| Chunk long text | Correct. Read `Speech.maxSpeechInputLength` at runtime; the Android value is not documented |
| Offline detection with `expo-network` | Use `useNetworkState().isInternetReachable`, not `isConnected` |
| `@epubjs-react-native/core` with the local file, offline | **Unverified.** README documents `src` as base64, epub or opf and only shows https URLs. It does not say whether epub.js is bundled or loaded from a CDN. Needs `react-native-webview`, `react-native-gesture-handler`, `@epubjs-react-native/expo-file-system`, so expect a dev build, not Expo Go. No text-extraction API |
| Extract text for Listen from the reader | Not provided by either reader. Parse the chapter XHTML from the EPUB zip yourself (JSZip), or inject a script through `onWebViewMessage` |
| epub.js on web from IndexedDB | epub.js is v0.3; archived `.epub` needs JSZip loaded first. Passing an ArrayBuffer is **unverified** from the README; check the API docs during the spike |
| PWA | `src/app/manifest.ts` plus a hand-written service worker, or Serwist. The Next.js guide does not use `next-pwa` |
| IndexedDB | `idb` v8, `openDB(name, version, { upgrade })`. Do not `await` other work inside a transaction |

## 5. Changes to make in the Phase 2 prompt

1. Add **checkpoint 0**: create the Supabase project, base schema migration, rename `002`/`003`, move web auth from JSON files to Supabase Auth, add Supabase to Android with `LargeSecureStore`. The audit in section 2 becomes "what to replace" rather than "what to remove".
2. Replace `web/app/api/` with `web/src/app/api/` and `web/lib/` with `web/src/lib/`.
3. Replace "service role key" and "anon key" with secret and publishable keys; `EXPO_PUBLIC_*` gets only the publishable key.
4. Migration name comes from `supabase migration new phase2`.
5. Section 3: every `security definer` function uses `set search_path = ''`; every new table gets explicit revokes.
6. Section 4: custom SMTP is required, not optional, because the built-in sender only reaches team members.
7. Section 6.2: use the new `expo-file-system` API (`Paths.document`, `File.createDownloadTask`).
8. Section 7.7: no native pause on Android; stop and restart from the saved chunk.
9. Add a **reader spike** before checkpoint 7: open a local EPUB offline on Android (dev build) and on web from IndexedDB, and extract one chapter's text for Listen. If `@epubjs-react-native` can't load a local file offline, fall back to a WebView with bundled epub.js.
10. Section 8: Gutenberg files via harvest or mirror with 2 s pacing; keep EPUBs unmodified; drop Standard Ebooks automation and OpenStax; size cap per file (for example 5 MB, prefer `epub.noimages` when the images edition is too big) to stay under 1 GB storage.
11. Demo prep: free projects pause after a week of inactivity.

## Sources read
- gutendex.com, gutendex.com/books (live query), gutenberg.org/policy/robot_access.html, gutenberg.org/policy/license.html
- standardebooks.org/feeds, standardebooks.org/bulk-downloads; openstax.org (not readable)
- supabase.com/docs: local-development (CLI, migrations, config), auth/server-side/nextjs, api/api-keys, auth/quickstarts/react-native, tutorials/with-expo-react-native, auth/passwords, auth/general-configuration, auth/auth-smtp, auth/auth-anonymous, storage/serving/downloads, reference createSignedUrl, getClaims, startAutoRefresh, database/postgres/row-level-security, pricing
- docs.expo.dev SDK 58: filesystem, filesystem-legacy, speech, sqlite, network
- github.com/victorsoares96/epubjs-react-native, github.com/futurepress/epub.js, github.com/jakearchibald/idb
- developer.mozilla.org SpeechSynthesis, nextjs.org/docs/app/guides/progressive-web-apps
