-- Featured shelf. Counts only: downloads (including repeats), favorites, and library adds.
-- No user ids leave this function. Browse uses the counts to order the shelf.
-- With no rows here, the apps show the most widely known works and nothing else.

create or replace function public.book_engagement()
returns table (
  slug text,
  downloads integer,
  favorites integer,
  library_adds integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.slug,
    coalesce(d.n, 0)::integer as downloads,
    coalesce(f.n, 0)::integer as favorites,
    coalesce(l.n, 0)::integer as library_adds
  from public.books b
  left join (
    select book_id, sum(times_downloaded)::integer as n
    from public.downloads
    group by book_id
  ) d on d.book_id = b.id
  left join (
    select book_id, count(*)::integer as n
    from public.favorites
    group by book_id
  ) f on f.book_id = b.id
  left join (
    select book_id, count(*)::integer as n
    from public.library_items
    group by book_id
  ) l on l.book_id = b.id
  where coalesce(d.n, 0) + coalesce(f.n, 0) + coalesce(l.n, 0) > 0;
$$;

revoke all on function public.book_engagement() from public, anon, authenticated;
grant execute on function public.book_engagement() to anon, authenticated;
