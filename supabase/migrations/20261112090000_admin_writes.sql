-- Admin writes: change a role, create/update/delete a book. Every function checks is_admin(),
-- enforces its safeguards in SQL, and writes an audit row. Errors use short codes the app maps
-- to messages: not allowed, invalid, not found, self, last admin, has downloads.

-- ---------------------------------------------------------------------------
-- Role change

create or replace function public.admin_set_user_role(p_user uuid, p_role text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_role not in ('user', 'admin') then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'self' using errcode = '22023';
  end if;

  -- Lock admin rows so two concurrent demotions cannot remove the last administrator.
  perform 1 from public.profiles where role = 'admin' for update;

  select role into v_old from public.profiles where id = p_user for update;
  if v_old is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  if v_old = p_role then
    return;
  end if;
  if v_old = 'admin' and p_role <> 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'last admin' using errcode = '22023';
  end if;

  update public.profiles set role = p_role where id = p_user;
  perform public.admin_log('set_role', p_user, jsonb_build_object('from', v_old, 'to', p_role));
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Books

create or replace function public.admin_save_book(
  p_slug text,
  p_title text,
  p_author text,
  p_category text,
  p_language text,
  p_license text,
  p_source_name text,
  p_source_url text,
  p_summary text,
  p_cover_url text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_author text := btrim(coalesce(p_author, ''));
  v_category text := btrim(coalesce(p_category, ''));
  v_license text := btrim(coalesce(p_license, ''));
  v_cover text := nullif(btrim(coalesce(p_cover_url, '')), '');
  v_source_url text := btrim(coalesce(p_source_url, ''));
  v_slug text;
  v_base text;
  v_n int := 1;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_title = '' or v_author = '' or v_category = '' or v_license = '' then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if v_cover is not null and v_cover !~* '^https?://' then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if v_source_url <> '' and v_source_url !~* '^https?://' then
    raise exception 'invalid' using errcode = '22023';
  end if;

  if p_slug is not null and p_slug <> '' then
    update public.books
    set title = v_title,
        author = v_author,
        category = v_category,
        language = coalesce(nullif(btrim(coalesce(p_language, '')), ''), 'English'),
        license = v_license,
        source_name = coalesce(nullif(btrim(coalesce(p_source_name, '')), ''), 'Manual entry'),
        source_url = v_source_url,
        summary = coalesce(p_summary, ''),
        cover_url = v_cover,
        updated_at = now()
    where slug = p_slug;
    if not found then
      raise exception 'not found' using errcode = 'P0002';
    end if;
    perform public.admin_log('update_book', null, jsonb_build_object('slug', p_slug));
    return p_slug;
  end if;

  v_base := trim(both '-' from lower(regexp_replace(v_title, '[^a-zA-Z0-9]+', '-', 'g')));
  if v_base = '' then
    v_base := 'book';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.books where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.books (slug, title, author, category, language, license, source_name, source_url, summary, cover_url)
  values (
    v_slug, v_title, v_author, v_category,
    coalesce(nullif(btrim(coalesce(p_language, '')), ''), 'English'),
    v_license,
    coalesce(nullif(btrim(coalesce(p_source_name, '')), ''), 'Manual entry'),
    v_source_url,
    coalesce(p_summary, ''),
    v_cover
  );
  perform public.admin_log('create_book', null, jsonb_build_object('slug', v_slug));
  return v_slug;
end;
$$;

revoke all on function public.admin_save_book(text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.admin_save_book(text, text, text, text, text, text, text, text, text, text) to authenticated;

create or replace function public.admin_delete_book(p_slug text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select id into v_id from public.books where slug = p_slug for update;
  if v_id is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  -- Download records keep the statistics honest, so a book that was downloaded stays.
  if exists (select 1 from public.downloads where book_id = v_id) then
    raise exception 'has downloads' using errcode = '23503';
  end if;

  delete from public.books where id = v_id;
  perform public.admin_log('delete_book', null, jsonb_build_object('slug', p_slug));
end;
$$;

revoke all on function public.admin_delete_book(text) from public, anon;
grant execute on function public.admin_delete_book(text) to authenticated;
