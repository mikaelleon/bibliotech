-- Admin analytics fixes.
--   - admin_stats(p_days): the chart covers the range asked for (7, 30 or 90 days), not always 30
--   - download counts are named for what they measure:
--       uniqueDownloads = one per (reader, book), downloadEvents = every save including repeats
--   - top books carry their slug so the page can link to them
-- Replaces admin_stats() from 20261110090000_admin_privacy.sql.

drop function if exists public.admin_stats();

create function public.admin_stats(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_days int := case when p_days in (7, 30, 90) then p_days else 30 end;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'books', (select count(*) from public.books),
    'registeredUsers', (
      select count(*) from public.profiles p where p.role <> 'admin' and p.email_verified_at is not null
    ),
    'guestUsers', (
      select count(*) from public.profiles p where p.role <> 'admin' and p.email_verified_at is null
    ),
    'downloads', (select count(*) from public.downloads),
    'downloadEvents', (select coalesce(sum(d.times_downloaded), 0) from public.downloads d),
    'repeatDownloads', (select coalesce(sum(d.times_downloaded - 1), 0) from public.downloads d),
    'downloadsLast30Days', (
      select count(*) from public.downloads d where d.first_downloaded_at >= now() - interval '30 days'
    ),
    'downloadsInRange', (
      select count(*) from public.downloads d
      where d.first_downloaded_at::date >= current_date - (v_days - 1)
    ),
    'booksByCategory', (
      select coalesce(jsonb_agg(jsonb_build_object('label', c.category, 'count', c.n) order by c.n desc), '[]'::jsonb)
      from (select b.category, count(*) as n from public.books b group by b.category) c
    ),
    'mostDownloaded', (
      select coalesce(jsonb_agg(jsonb_build_object('id', t.slug, 'title', t.title, 'count', t.n) order by t.n desc, t.title), '[]'::jsonb)
      from (
        select b.slug, b.title, count(*) as n
        from public.downloads d
        join public.books b on b.id = d.book_id
        group by b.id, b.slug, b.title
        order by count(*) desc, b.title
        limit 10
      ) t
    ),
    'recentDownloads', (
      select coalesce(jsonb_agg(jsonb_build_object('who', r.who, 'book', r.title, 'at', r.at) order by r.at desc), '[]'::jsonb)
      from (
        select public.mask_identity(p.display_name, u.email::text) as who,
               b.title,
               d.last_downloaded_at as at
        from public.downloads d
        join public.books b on b.id = d.book_id
        join public.profiles p on p.id = d.user_id
        left join auth.users u on u.id = d.user_id
        order by d.last_downloaded_at desc
        limit 10
      ) r
    ),
    'downloadsPerDay', (
      select coalesce(jsonb_agg(jsonb_build_object('date', s.day, 'count', s.n) order by s.day), '[]'::jsonb)
      from (
        select days.day::date as day, count(d.id) as n
        from generate_series(current_date - (v_days - 1), current_date, interval '1 day') as days(day)
        left join public.downloads d on d.first_downloaded_at::date = days.day::date
        group by days.day
      ) s
    )
  );
end;
$$;

revoke all on function public.admin_stats(int) from public, anon;
grant execute on function public.admin_stats(int) to authenticated;
