-- Checkpoint 4: file location for each book, private storage bucket, reading progress.
-- request_download now refuses a book that has no file.

alter table public.books add column if not exists source text;
alter table public.books add column if not exists source_id text;
alter table public.books add column if not exists file_path text;
alter table public.books add column if not exists file_size_bytes bigint;
alter table public.books add column if not exists attribution text;

alter table public.books drop constraint if exists books_file_size_cap;
alter table public.books add constraint books_file_size_cap
  check (file_size_bytes is null or (file_size_bytes > 0 and file_size_bytes <= 5242880));

create unique index if not exists books_source_id_key
  on public.books (source, source_id)
  where source is not null and source_id is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('books', 'books', false, 5242880, array['application/epub+zip'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['application/epub+zip'];

-- No select policy: the bucket stays private. The API mints a 60-second signed URL
-- after request_download succeeds. The secret key uploads, and it bypasses storage RLS.

create or replace function public.request_download(
  p_user uuid,
  p_book uuid,
  p_device text,
  p_confirm_repeat boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_tier text;
  v_existing public.downloads%rowtype;
  v_quota jsonb;
  v_used int;
  v_limit int;
  v_device text := left(nullif(btrim(p_device), ''), 80);
begin
  perform pg_advisory_xact_lock(hashtextextended('request_download:' || p_user::text, 0));

  v_tier := public.account_tier(p_user);
  if v_tier is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_tier = 'admin' then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if not exists (
    select 1 from public.books b
    where b.id = p_book and b.file_path is not null
  ) then
    return jsonb_build_object('status', 'not_available');
  end if;

  select * into v_existing from public.downloads d where d.user_id = p_user and d.book_id = p_book for update;
  if found then
    v_quota := public.quota_status(p_user);
    if not coalesce(p_confirm_repeat, false) then
      return v_quota || jsonb_build_object('status', 'already_downloaded',
        'lastDownloadedAt', v_existing.last_downloaded_at);
    end if;
    update public.downloads
    set last_downloaded_at = now(),
        times_downloaded = times_downloaded + 1,
        last_device_label = coalesce(v_device, last_device_label)
    where id = v_existing.id;
    return v_quota || jsonb_build_object('status', 'repeat_ok');
  end if;

  v_quota := public.quota_status(p_user);
  v_used := (v_quota ->> 'used')::int;
  v_limit := (v_quota ->> 'limit')::int;
  if v_used >= v_limit then
    return v_quota || jsonb_build_object('status', 'quota_exceeded');
  end if;

  insert into public.downloads (user_id, book_id, last_device_label) values (p_user, p_book, v_device);
  return v_quota || jsonb_build_object('status', 'ok', 'used', v_used + 1);
end;
$$;

revoke all on function public.request_download(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.request_download(uuid, uuid, text, boolean) to service_role;

create table if not exists public.reading_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  cfi text not null,
  progress numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

alter table public.reading_progress enable row level security;

revoke all on table public.reading_progress from anon, authenticated;
grant select, insert, update, delete on table public.reading_progress to authenticated;

drop policy if exists reading_progress_own on public.reading_progress;
create policy reading_progress_own
  on public.reading_progress
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
