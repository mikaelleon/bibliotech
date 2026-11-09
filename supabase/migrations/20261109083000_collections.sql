-- Named groups inside a reader's Library. A book with no group stays on the shelf only.
-- kind distinguishes a reading list (meant to be read through) from a collection (a group).

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  kind text not null default 'collection',
  created_at timestamptz not null default now(),
  constraint collections_name_len check (char_length(btrim(name)) between 1 and 80),
  constraint collections_kind check (kind in ('collection', 'reading_list')),
  constraint collections_user_kind_name unique (user_id, kind, name)
);

create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, book_id)
);

create index collection_items_book_id_idx on public.collection_items (book_id);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

revoke all on table public.collections from anon, authenticated;
revoke all on table public.collection_items from anon, authenticated;
grant select, insert, update, delete on table public.collections to authenticated;
grant select, insert, update, delete on table public.collection_items to authenticated;

create policy collections_own
  on public.collections
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy collection_items_own
  on public.collection_items
  for all
  to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  );
