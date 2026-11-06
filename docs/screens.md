# Screens

Routes below are the Phase 1 app. Android has no admin screens. A guest is a signed-in anonymous session in the local stub (a guest cookie, not a Supabase anonymous user). A registered user has an account. An admin has `role = admin` on the server.

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
| Admin overview | admin | `/admin` | none | | no downloads | | |
| Admin books | admin | `/admin/books` | none | | no matches | | Delete |
| Add book | admin | `/admin/books/new` | none | | | required fields | Save |
| Edit book | admin | `/admin/books/[id]/edit` | none | | | required fields | Save |
| Admin users | admin | `/admin/users` | none | | no matches | | role changes |
| Admin downloads | admin | `/admin/downloads` | none | | no rows | | |
| Download limit | gallery only | dialog on `/dev/states` | not linked | | | | |
| Offline | any | banner under the top bar | banner under the header | | | retry on a failed page | |
| State gallery | signed-in, development only | `/dev/states` | none | skeleton sample | empty sample | 403 and 404 samples | |

Judgment calls:

- The Admin frame uses a shield icon and no mobile admin tab. Those stay. The later note that asked for `layout-dashboard` and a mobile Admin tab loses to the frame.
- There is no database, so search, library, favorites, and admin figures run in the Next.js server against the catalog and the JSON files. The SQL migration is the contract for later.
- Library and favorites for `dane@elibrary.local` are seeded in `web/data` so the demo can show a populated library. Downloads stay empty.
- Guest download copy uses 5 of 5 left, because guest downloads are not counted yet.
- Email confirmation is not turned on. Check your email appears only after Forgot password, and no email is sent.
- `/reset-password` without `?token=` (or with `token=expired`) shows the expired link. Any other token shows the form. The new password is not stored, because there is no mailer.
- Added dates on the admin book list say "Not recorded". The catalog has no created date.
