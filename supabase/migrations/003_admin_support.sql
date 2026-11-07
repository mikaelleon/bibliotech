-- Additive. Replaces the admin functions from 002 with the pieces that were missing:
-- downloads per day, a match count on the user list, and a downloads list.
-- 002 is left as it was.

drop function if exists public.admin_list_users(text, int, int);

create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'books', (select count(*) from public.books),
    'registeredUsers', (select count(*) from auth.users where is_anonymous = false),
    'guestSessions', (select count(*) from auth.users where is_anonymous = true),
    'downloads', (select count(*) from public.downloads),
    'downloadsLast30Days', (
      select count(*) from public.downloads
      where created_at >= now() - interval '30 days'
    ),
    'booksByCategory', (
      select coalesce(jsonb_agg(jsonb_build_object('label', category, 'count', n) order by n desc), '[]'::jsonb)
      from (
        select category, count(*) as n
        from public.books
        group by category
      ) categories
    ),
    'mostDownloaded', (
      select coalesce(jsonb_agg(jsonb_build_object('title', title, 'count', n) order by n desc), '[]'::jsonb)
      from (
        select b.title, count(*) as n
        from public.downloads d
        join public.books b on b.id = d.book_id
        group by b.id, b.title
        order by count(*) desc
        limit 5
      ) top_books
    ),
    'recentDownloads', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'who', who_name,
        'book', title,
        'at', created_at
      ) order by created_at desc), '[]'::jsonb)
      from (
        select
          case
            when d.user_id is null or u.is_anonymous is true then 'Guest'
            else coalesce(nullif(p.display_name, ''), u.email::text, 'Guest')
          end as who_name,
          b.title,
          d.created_at
        from public.downloads d
        join public.books b on b.id = d.book_id
        left join public.profiles p on p.id = d.user_id
        left join auth.users u on u.id = d.user_id
        order by d.created_at desc
        limit 10
      ) recent
    ),
    'downloadsPerDay', (
      select coalesce(jsonb_agg(jsonb_build_object('date', day, 'count', n) order by day), '[]'::jsonb)
      from (
        select days.day::date as day, count(d.id) as n
        from generate_series((current_date - 29), current_date, interval '1 day') as days(day)
        left join public.downloads d on d.created_at::date = days.day::date
        group by days.day
      ) series
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.admin_list_users(search text, lim int, off int)
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz,
  downloads_used int,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.display_name,
    p.role,
    p.created_at,
    (select count(*)::int from public.downloads d where d.user_id = p.id) as downloads_used,
    count(*) over () as total_count
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.is_anonymous = false
    and (
      search is null
      or btrim(search) = ''
      or p.display_name ilike '%' || search || '%'
      or u.email::text ilike '%' || search || '%'
    )
  order by p.created_at desc
  limit greatest(coalesce(lim, 25), 0)
  offset greatest(coalesce(off, 0), 0);
end;
$$;

create or replace function public.admin_list_downloads(lim int, off int)
returns table (
  who_label text,
  book_title text,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    case
      when d.user_id is null or u.is_anonymous is true then 'Guest'
      else coalesce(nullif(p.display_name, ''), u.email::text, 'Guest')
    end as who_label,
    b.title as book_title,
    d.created_at,
    count(*) over () as total_count
  from public.downloads d
  join public.books b on b.id = d.book_id
  left join public.profiles p on p.id = d.user_id
  left join auth.users u on u.id = d.user_id
  order by d.created_at desc
  limit greatest(coalesce(lim, 25), 0)
  offset greatest(coalesce(off, 0), 0);
end;
$$;

revoke all on function public.admin_stats() from public, anon;
revoke all on function public.admin_list_users(text, int, int) from public, anon;
revoke all on function public.admin_list_downloads(int, int) from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_list_users(text, int, int) to authenticated;
grant execute on function public.admin_list_downloads(int, int) to authenticated;
