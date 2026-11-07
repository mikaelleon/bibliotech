# Admin audit

The access model changed after this audit. Administrators now use a separate shell (Dashboard, Analytics, Books, Users), reader routes redirect to `/admin`, and Android shows a notice instead of the reader app. The notes below describe the earlier pass, when Admin was a fifth rail item.



Checked on 7 November 2026, before the completion pass. Scope is `web/` only. There is no live Supabase project. Admin figures come from the catalog and `web/data/users.json`. The SQL in `supabase/migrations/` is the contract for a later database and is not applied.

The design frame `e-library-ai-design/project/Admin.dc.html` is a placeholder: a shield icon in the rail, the title "Admin dashboard", and a note that the dashboard arrives later. The mobile frames (`MBrowse.dc.html` and the other `M*.dc.html` files) use four bottom tabs: Browse, Library, Favorites, Profile. They do not include Admin. Where this prompt and those frames disagree, the frames win.

## A. Inventory

| Screen | Route | Status | Data | States | Mobile | Conformance |
|---|---|---|---|---|---|---|
| Access and 403 | `/admin/*` via `admin/layout.tsx` | complete | session role, re-read from `users.json` | error panel; no session is redirected by `proxy.ts` | yes | Matches `ErrorPanel`. No pills or extra color. |
| Admin rail item | shell | complete | real session | hidden unless `role` is `admin` | no Admin tab, which matches the mobile frames | Shield icon and `aria-label="Admin"`. The prompt's `layout-dashboard` icon loses to the frame. |
| Section tabs | inside `/admin/*` | complete | n/a | active underline | row scrolls | Underline tabs, 14/20, 44px, ink underline. Marked up as `role="tab"` without arrow-key behavior. |
| Account role | account menu | missing | n/a | n/a | menu is desktop only | The open menu has Log out and does not show the muted word "Admin". |
| Overview | `/admin` | partial | books and users are real local counts; downloads are 0 | empty copy for most downloaded and recent downloads; no `loading.tsx` or `error.tsx` | yes, stats are 2x2 | No 30-day chart. Recent downloads is a paragraph, not `DataTable`. Section gap is 32px, not 64px. |
| Books | `/admin/books` | partial | real catalog | empty search copy; pagination "1 to 19 of 19"; Delete disabled | stacked rows, but the cover is the first line | Added date is "Not recorded" because the catalog has no created date. An Apply button sits beside the filters. |
| Users | `/admin/users` | partial | real local accounts | empty search copy; pagination | yes | Joined date is "Not recorded". Role is plain text. Note "Role changes arrive in Phase 2." |
| Downloads | `/admin/downloads` | placeholder | hard-coded empty list | empty sentence | yes | No pagination, because the page never asks for a page of rows. |
| Add book | `/admin/books/new` | partial | none | Save disabled, helper text present | yes, 640px form | Description is required. License is not. URLs are not checked. |
| Edit book | `/admin/books/[id]/edit` | partial | real book, pre-filled | same as Add | yes | Download URL has no stored value, so the field is blank. Same validation gaps. |
| Delete dialog | row menu on Books | complete for stub mode | names the book | Delete disabled, helper text present | yes | No extra destructive color. |
| Downloads chart | `/admin` | missing | n/a | n/a | n/a | Not built. |
| Per-route loading and error | `/admin` | missing | n/a | n/a | n/a | Browse has them. Admin does not. |
| State gallery | `/dev/states` | partial | samples | 403 sample is present | yes | No chart empty state, disabled Save, or delete dialog sample. |

## B. Security

**How admin is decided.** `getSession()` verifies the signed cookie, then loads the account from `web/data/users.json`. The role on the cookie is not trusted. `isAdminSession` is true only when `session.kind === "user"` and `session.role === "admin"`. `assertAdmin` throws `not allowed` otherwise.

**What each visitor sees.**

- No cookie: `web/src/proxy.ts` redirects every non-public path, including `/admin` and its children, to `/login`.
- Guest cookie: the proxy lets the request through. `admin/layout.tsx` renders the 403 panel and does not render the page. Confirmed in the browser: guest chrome (Log in, Register, locked library) and the heading "You don't have access to this area". The Admin rail item is absent.
- Registered non-admin: the same 403. Dane Peralta is `role: "user"`. The Admin rail item is absent.
- Admin: the layout renders the page. There is no seeded admin. A temporary local role change was used to look, then restored. The demo account is not an admin.

**Flash of admin data.** Each admin page returns `null` before it reads stats or lists when the session is not an admin. The layout also withholds `children`. `adminStats`, `adminListUsers`, and the new list helper throw before they read data.

**Database support in `supabase/migrations/002_admin_and_library.sql`.**

| Piece | Present |
|---|---|
| `is_admin()` security definer, stable | yes |
| Select policies on `profiles` and `downloads` using `is_admin()` | yes |
| `admin_stats()` raises `not allowed` | yes, but it does not return downloads per day |
| `admin_list_users(search, lim, off)` raises `not allowed` | yes, but it does not return the total match count |
| `admin_list_downloads(lim, off)` | no |
| Execute revoked from `anon` and `public`, granted to `authenticated` | yes, for the two functions that exist |
| Users cannot update their own `role` | yes: `revoke update (role)` and a restrictive update policy |

**Defects.** None of this SQL runs, because there is no database. That is a known limit, not an open hole in the running app. The SQL contract is short of Part 3: no per-day series, no match count, no downloads list function. The running app mirrors the same gap: downloads are a hard-coded empty list, so an admin cannot see a download that does not exist, and a non-admin cannot read one either. Profile updates never write `role`.

Emails are returned only from `adminListUsers`, and only after `assertAdmin`. No service-role key is in the repo.

## C. Plan

Build order, stub writes only:

1. **Tier 1.** Loading and error for `/admin`. Muted "Admin" in the account menu. Recent downloads uses `DataTable`. Books filters submit from the field and the category select, without a second button. Stacked book rows lead with the title. Section gap 64px. Section tabs are a navigation landmark. Shield icon and the four-item phone bar stay.
2. **Tier 2.** 30-day chart on the overview. Downloads list helper and pagination. Book form checks title, author, category, license, and `http://` or `https://` URLs. Save and Delete stay disabled. `supabase/migrations/003_admin_support.sql` adds the missing function pieces. `docs/database.md` records it.
3. **Tier 3.** Gallery samples, `docs/screens.md`, this file's final status, `docs/testing.md`, and screenshots under `docs/screenshots/admin/`.

Out of scope: Android, import, account deletion, bulk actions, and live writes.

## D. Final status

| Screen | After this pass |
|---|---|
| 403 and login redirect | unchanged, still the guard |
| Rail | unchanged shield, still admins only, still no phone tab |
| Account menu | muted "Admin" when the role is admin |
| Overview | chart, category bars, most downloaded, recent downloads table |
| Books | search and category in the URL, stacked title first, pagination, row menu |
| Users | unchanged read-only list, joined date still "Not recorded" |
| Downloads | empty list from `adminListDownloads`, pagination appears once rows exist |
| Add and edit | license required, URL scheme checked, Save stays disabled |
| Delete | unchanged stub |
| Loading and error | `admin/loading.tsx` and `admin/error.tsx` |
| SQL | `003_admin_support.sql` added. Not applied. |

Stubbed, with the control disabled: Save book ("Saving arrives in Phase 2.") and Delete ("Deleting arrives in Phase 2."). Role changes stay a note on the Users page. No book, user, or download row is written.
