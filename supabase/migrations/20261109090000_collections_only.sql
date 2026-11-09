-- Reading lists and collections are one thing. Keep the kind column, but stop using reading_list.
update public.collections as lists
set name = lists.name || ' (2)'
where lists.kind = 'reading_list'
  and exists (
    select 1
    from public.collections as shelves
    where shelves.user_id = lists.user_id
      and shelves.kind = 'collection'
      and shelves.name = lists.name
  );

update public.collections
set kind = 'collection'
where kind = 'reading_list';
