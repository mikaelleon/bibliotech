-- Copy one statement at a time into the SQL editor.
-- Do not run this file as a script. Nothing here executes on its own.
-- Replace the sample email before you paste a statement.
-- Never paste a service-role key into the app or into git.

-- Promote one account to admin. The demo reader dane@elibrary.local is not an admin.
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'admin@example.com');

-- Sample favorites for that account. Replace the book ids with real ones.
-- insert into public.favorites (user_id, book_id)
-- select u.id, b.id
-- from auth.users u
-- join public.books b on b.title in ('Dracula', 'Walden')
-- where u.email = 'dane@elibrary.local'
-- on conflict do nothing;

-- Sample library items for that account.
-- insert into public.library_items (user_id, book_id)
-- select u.id, b.id
-- from auth.users u
-- join public.books b on b.title in ('Pride and Prejudice', 'Frankenstein', 'Meditations')
-- where u.email = 'dane@elibrary.local'
-- on conflict do nothing;
