# Bibliotech

Bibliotech is a digital library for free public-domain books, mostly from [Project Gutenberg](https://www.gutenberg.org/). Readers browse a shared catalog, open a book in the app, or download an EPUB to keep. A signed-in account keeps a library, favorites, collections, reading position, and download history.

The same catalog and accounts serve two clients:

- **Web** (`web/`) is a Next.js app. It is also the HTTP API the phone calls.
- **Android** (`android/`) is an Expo app. It talks to Supabase for the catalog and account, and to the web API for downloads, reading progress, email verification, featured counts, and the assistant.

Accounts, files, and row security live in **Supabase** (Postgres, Auth, and a private Storage bucket).

## Required features checklist

Status of the project brief. Reference for the interface: [z-library.sk](https://z-library.sk/). Host and backend: [wasmer.io](https://wasmer.io).

> **Mandatory:** the AI agent must be embedded in the website and the Android app. Redirecting users to an external chatbot does not satisfy the brief.

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | At least 200 unique books on both platforms | Done | 209 books imported ([catalog report](docs/catalog-report.md)). Web and Android read the same catalog |
| 2 | Guest Mode, maximum 5 book downloads | Partial | The Guest tier is an unverified account with 5 downloads a month. The "Continue as guest" visitor session cannot download |
| 3 | Registered User Mode, maximum 10 book downloads | Done | Verified account, 10 new books a month, enforced in `request_download()` |
| 4 | Secure registration, login, and logout | Done | Supabase Auth, email verification, password reset, on web and Android |
| 5 | Search and filtering by title, author, and category | Done | `/search`, `/browse`, suggestions, category filter |
| 6 | Book information and legally authorized download access | Done | Public-domain Project Gutenberg EPUBs, 60-second signed URLs |
| 7 | Embedded agentic AI assistant in both apps | Done | Web `ai-assistant.tsx`, Android `AIAssistant.tsx`, both calling `/api/assistant` |
| 8 | Personalized My Library and favorites | Done | Library, collections, and favorites on web and Android |
| 9 | Synchronized user information and download records | Done | One Supabase project and `/api/downloads` shared by both clients |
| 10 | Administrator dashboard on the website | Done | `/admin`: dashboard, analytics, catalog, accounts, audit log |
| 11 | Shared database and RESTful API integration | Done | Supabase Postgres and route handlers in `web/src/app/api/` ([API docs](docs/api.md)) |
| 12a | Cybersecurity | Partial | Row security, server-only secret key, rate limits, hashed tokens. Security headers (CSP, HSTS, X-Frame-Options) are not set |
| 12b | Testing | Partial | Unit tests for featured ranking, assistant, and importer only. No auth, quota, admin, or Android tests |
| 12c | Cloud deployment (Wasmer) | Not done | No Wasmer configuration yet |
| 12d | DevOps (CI/CD) | Not done | No `.github/workflows/` yet |

## Repository layout

| Path | What it is |
|---|---|
| `web/` | Next.js 16 reader site, admin site, and route handlers |
| `android/` | Expo Router app (package `app.elibrary`) |
| `supabase/migrations/` | SQL migrations, applied in filename order |
| `supabase/dev-seed.sql` | Commented statements for promoting an admin. Not run automatically |
| `scripts/import-books/` | Catalog importer. Runs on a machine, never inside either app |
| `docs/` | API, database, assistant, and design notes |
| `design/` | Shared visual tokens |

## What a reader can do

- Browse and search the catalog. Categories are Fiction, Classics, Philosophy, History, Science, Technology, Business, Poetry, Children, and Education.
- Open a book page and read the EPUB in the app. The saved place is a spine location (`epubcfi`), not a character offset.
- Download a book. Files sit in a private Storage bucket. The API returns a signed URL that lasts 60 seconds.
- Continue without an account. That session can open public pages. It does not keep a library, favorites, or download history.
- Create an account. An unverified account is the Guest tier: **5 new books a month**. Verifying the email raises that to **10**. The month is anchored on the registration time in UTC, not the calendar month. Downloading a book already in the account's history does not use another slot.
- Keep a Library shelf, named collections inside it, and a separate Favorites list. Adding a book to the Library does not use a download.
- Ask the reading assistant about books, authors, and what is in this catalog. It refuses questions outside that scope.

Administrators do not browse or download. On the web they are sent to `/admin`. On Android they see a notice and can log out.

## Featured books

Browse opens with a Featured shelf of at most 16 books. It is not the whole catalog.

With no reader activity, the shelf is a fixed list of widely known works, in this order: Pride and Prejudice, Frankenstein, Alice's Adventures in Wonderland, Dracula, Moby-Dick, The Adventures of Sherlock Holmes, Great Expectations, A Tale of Two Cities, Jane Eyre, Wuthering Heights, The Wonderful Wizard of Oz, Little Women, A Christmas Carol, Peter Pan, The Art of War, and Meditations. A title is skipped when that work is not in the catalog. When two editions share a title, the seeded slug is preferred.

A download (including a repeat save), a favorite, and a library add each add one to that book's score. The highest score leads. A book outside the list above joins the shelf only after it has a score, and it can take a slot from a known work that nobody has used. The shelf does not grow past 16.

Counts come from `book_engagement()` in `supabase/migrations/20261119100000_featured_books.sql`. That function returns aggregates only: no account ids. Until it is applied, the web server totals the same tables with the secret key, and the phone can read `GET /api/featured` from `EXPO_PUBLIC_API_URL`.

The assistant does not see this ranking. It is given catalog lines (slug, title, author, category, publication, language, summary) and, for a signed-in reader, that reader's own library, favorites, and collections. It cannot answer "what is featured" from the shelf.

## Admin

The web admin area covers:

- Dashboard counts and the latest downloads
- Analytics over a chosen day range
- Catalog create, edit, and delete. A book that already has download rows cannot be deleted
- Accounts: create, edit role, reset access, and delete. Deleting an account keeps download rows and clears the person on them, so the counts stay honest
- An audit log of admin writes

The first admin is promoted by hand. See the commented statement in `supabase/dev-seed.sql`.

## Stack

| Piece | Choice |
|---|---|
| Web | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Android | Expo SDK 58, Expo Router, React Native 0.88 |
| Data | Supabase Postgres, Auth, Storage |
| Books | EPUB from Project Gutenberg, metadata from Gutendex (CSV fallback) |
| Mail | Resend, for the email-verification link |
| Assistant | Gemini, called only from the web server |

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project
- For a device build: Android Studio, or an EAS build (`android/eas.json`)
- Optional: the [Supabase CLI](https://supabase.com/docs/guides/cli), signed in, to push migrations

## Setup

### 1. Database

From the repository root, with the CLI logged in and the project linked:

```bash
supabase db push
```

Migrations in `supabase/migrations/` create profiles, books, downloads, favorites, library items, collections, reading progress, quota, verification tokens, admin functions, featured counts, and the assistant tables. The private `books` bucket holds the EPUB files. Clients cannot upload to it and cannot read it directly.

Promote an admin with the statement in `supabase/dev-seed.sql` after someone has signed up. Paste it in the SQL editor. Do not run that file as a script.

### 2. Web

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create `web/.env.local` (it is not committed):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
APP_URL=http://localhost:3000

# Optional. Without these, development prints the verification link in the server console.
RESEND_API_KEY=
EMAIL_FROM=Bibliotech <books@your-domain>

# Optional. Without GEMINI_API_KEY the assistant route refuses to start.
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
```

`NEXT_PUBLIC_` values are safe in the browser. `SUPABASE_SECRET_KEY` bypasses row security. It stays on the server: downloads, verification, admin writes, and the featured-count fallback. Never put it in `android/.env` or in a `NEXT_PUBLIC_` / `EXPO_PUBLIC_` name.

Other assistant knobs, all optional, are read in `web/src/lib/assistant/config.ts`: `AI_GLOBAL_DAILY_LIMIT` (1200), `AI_GLOBAL_RPM_LIMIT` (24), `AI_IP_DAILY_LIMIT` (60), `AI_IP_SALT`, `AI_MAX_MESSAGE_CHARS` (300), `AI_MAX_HISTORY_TURNS` (6), `AI_BURST_SECONDS` (3).

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

Ranking tests, from `web/`:

```bash
node --experimental-strip-types --test src/lib/featured.test.ts
node --experimental-strip-types --test src/lib/assistant/assistant.test.ts
```

### 3. Android

```bash
cd android
npm install
copy .env.example .env
npx expo start
```

`android/.env` holds only public values. Expo bundles every `EXPO_PUBLIC_` variable into the app.

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

`EXPO_PUBLIC_API_URL` is the web app as the phone can reach it. Use the computer's LAN address, not `localhost`, when the app runs on a device. The phone needs this for downloads, progress, verification email, featured counts (until `book_engagement()` is applied), and the assistant.

| Script | What it does |
|---|---|
| `npm start` | Expo dev server |
| `npm run android` | Native Android build and run |
| `npm run lint` | ESLint |

A development build is required after adding a library with native code. Expo Go does not include every module this app uses (`expo-sqlite`, `expo-secure-store`).

### 4. Import books

From `scripts/import-books/`, after `npm install`:

```bash
node import.mjs --dry-run --limit 30
node import.mjs --limit 30
node import.mjs --ids 1342,84,2701
node import.mjs --source gutenberg --limit 220
```

The script reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` from the environment or from `web/.env.local`. Gutendex supplies metadata. Files come from the Gutenberg harvest, at least two seconds apart. An edition over 5 MB is skipped. A written report lands in `docs/catalog-report.md`.

```bash
npm test
```

runs `lib.test.mjs`.

The apps still ship a small static catalog in `web/src/lib/books.ts` and `android/lib/books.ts`. It is used only when the database catalog is empty or unreachable. Once `books` has rows, those rows replace it. The apps address every book by `books.slug`.

## Web routes

| Path | Who | Purpose |
|---|---|---|
| `/` | Public | Landing |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Public | Account access |
| `/guest` | Public | Start a visitor session and continue to Browse |
| `/verify-email` | Public | Result of the verification link |
| `/browse`, `/search`, `/books/[slug]` | Visitor or account | Catalog |
| `/library`, `/favorites`, `/downloads`, `/profile` | Account | Shelves, history, account |
| `/read/[slug]` | Account | Reader |
| `/admin` and `/admin/*` | Admin | Operations |
| `/privacy`, `/terms` | Public | Policies |
| `/dev/states` | Development only | UI state gallery |

## HTTP API

Route handlers live in `web/src/app/api/`. The web app sends its Supabase cookies. Android sends `Authorization: Bearer <access_token>`. The user id is taken from the verified token, never from the body.

Errors share one shape:

```json
{ "error": { "code": "QUOTA_EXCEEDED", "message": "You've used every download for this month." } }
```

| Method and path | Purpose |
|---|---|
| `GET /api/me` | Account, tier, and the current download period |
| `POST /api/auth/send-verification` | Email a one-time verification link |
| `GET /api/auth/verify?token=` | Consume the link and redirect to `/verify-email` |
| `GET /api/suggest?q=` | Up to six title and author suggestions |
| `GET /api/featured` | Download, favorite, and library counts per slug |
| `POST /api/books/[slug]/download` | Record the download and return a 60-second file URL |
| `GET /api/downloads` | This account's download history |
| `GET` / `PUT /api/books/[slug]/progress` | Read or save the reading place |
| `POST /api/assistant` | Stream an assistant reply |
| `GET /api/assistant/quota` | Questions left today and this month |
| `GET` / `POST /api/assistant/chats` | List or start saved chats |
| `GET` / `DELETE /api/assistant/chats/[id]` | Read or delete one chat |

Field-level detail, status codes, and example bodies are in [docs/api.md](docs/api.md). The assistant routes were added after that document; their limits live in `ai_limits` (unverified 5/day and 100/month, verified 20/day and 400/month, admin 40/day and 800/month).

## Data

Tables that matter day to day:

| Table | Holds |
|---|---|
| `profiles` | Display name, role (`user` or `admin`), email verification time |
| `books` | Catalog row, slug, and the private file path |
| `downloads` | One row per account and book: first save, last save, times saved, device label |
| `favorites` | One row per account and book |
| `library_items` | The Library shelf |
| `collections`, `collection_items` | Named groups inside that shelf |
| `reading_progress` | Last spine location and a 0–1 progress value |
| `quota_limits` | Monthly download caps by tier |

Row security limits favorites, library rows, collections, and progress to the owning account. Download rows are written only by `request_download()`, which the API calls with the secret key. The schema narrative is in [docs/database.md](docs/database.md). Later migrations after that file are the featured function and the assistant tables.

## Further reading

| Document | Subject |
|---|---|
| [docs/api.md](docs/api.md) | Request and response detail for the earlier routes |
| [docs/database.md](docs/database.md) | Tables, grants, and quota rules |
| [docs/ai-assistant.md](docs/ai-assistant.md) | Assistant design: grounding, quotas, refusals |
| [docs/screens.md](docs/screens.md) | Screen inventory |
| [docs/catalog-report.md](docs/catalog-report.md) | Last import report |
| [design/tokens.md](design/tokens.md) | Color, type, and spacing tokens |
