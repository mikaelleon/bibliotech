# Screens

Routes below are the Phase 1 app. An administrator is an operator: the web shell is Dashboard, Analytics, Books, and Users, and reader routes redirect to `/admin`. Android has no admin screens. If an administrator signs in there, the app shows a notice and a Log out button. A guest is a signed-in anonymous session in the local stub (a guest cookie, not a Supabase anonymous user). A registered user has an account. An admin has `role = admin` on the server.

| Screen | Role | Web | Android | Loading | Empty | Error | Disabled |
|---|---|---|---|---|---|---|---|
| Landing | visitor | `/` | none | | | | |
| Log in | visitor | `/login` | `(auth)/login` | | | wrong password | |
| Register | visitor | `/register` | `(auth)/register` | | | validation | |
| Forgot password | visitor | `/forgot-password` | `(auth)/forgot-password` | | | invalid email | |
| Check your email | visitor | replaces the forgot form | replaces the forgot form | | | | resend waits 30s |
| Reset password | visitor | `/reset-password` | none (the email opens the web page) | | | expired link | |
| Browse | guest, user | `/browse` | Browse tab | skeleton | empty category | retry | |
| Search results | guest, user | `/search` | `/search` | skeleton | no matches | retry | |
| Book detail | guest, user | `/books/[id]` | `book/[id]` | | missing book | | Download and Save |
| My Library | user (guest sees Locked) | `/library` | Library tab | | no saved books | | Save stays off |
| Favorites | user (guest sees Locked) | `/favorites` | Favorites tab | | no favorites | toast on failure | |
| Profile | user (guest sees Locked) | `/profile` | Profile tab | | | name and password | |
| 404 | any session | `not-found` | `+not-found` | | | the page itself | |
| 403 | signed-in non-admin | `/admin/*` | none | | | the page itself | |
| Dashboard | admin | `/admin` | notice only | skeleton | nothing to review, no downloads | retry | |
| Analytics | admin | `/admin/analytics` | none | | no downloads | retry | user growth and ratings |
| Admin books | admin | `/admin/books` | none | skeleton | no matches | retry | Delete |
| Add book | admin | `/admin/books/new` | none | | | required fields | Save |
| Edit book | admin | `/admin/books/[id]/edit` | none | | | required fields | Save |
| Admin users | admin | `/admin/users` | none | | no matches | | create, edit, delete |
| Create user | admin | `/admin/users/new` | none | | | | Create |
| User detail | admin | `/admin/users/[id]` | none | | | | save, reset, disable, delete |
| Account settings | admin | `/admin/account` | none | | | name and password | |
| Admin notice | admin | none | `admin-notice` | | | | |
| Download limit | gallery only | dialog on `/dev/states` | not linked | | | | |
| Offline | any | banner under the top bar | banner under the header | | | retry on a failed page | |
| State gallery | signed-in, development only | `/dev/states` | none | skeleton sample | empty sample | 403 and 404 samples | |

Judgment calls:

- Administrators do not browse, download, or rate. After login they land on `/admin`. Opening `/`, `/browse`, `/search`, `/books/*`, `/library`, `/favorites`, or `/profile` sends them back to `/admin`. Below 768px the same four operator items are tabs. Android never shows those screens.
- A guest can still open Log in and Register, so an anonymous session can become an account. A reader or an administrator who opens those pages is sent to their home.
- The downloads chart lives on Analytics. With no download rows it shows "No downloads yet. They will appear here as readers download books." `/admin/downloads` redirects there.
- Creating, editing, and deleting books and users is on screen and switched off. The helper text is "Arrives in Phase 2." An administrator cannot delete or demote their own account, and the last administrator cannot be removed.
- Added dates and joined dates say "Not recorded". The local catalog and `users.json` do not store those timestamps.
- There is no database, so search, library, favorites, and admin figures run in the Next.js server against the catalog and the JSON files. The SQL migration is the contract for later.
- Library and favorites for `dane@elibrary.local` are seeded in `web/data` so the demo can show a populated library. Downloads stay empty.
- Guest download copy uses 5 of 5 left, because guest downloads are not counted yet.
- Email confirmation is not turned on. Check your email appears only after Forgot password, and no email is sent.
- `/reset-password` without `?token=` (or with `token=expired`) shows the expired link. Any other token shows the form. The new password is not stored, because there is no mailer.
- Added dates on the admin book list say "Not recorded". The catalog has no created date.
