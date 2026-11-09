-- Gutenberg titles stored MARC 245 codes (` : $b ` subtitle, ` / $c ` responsibility).
-- Slugs stay as they are so existing links keep working.

update public.books as books
set title = cleaned.title
from (
  select
    id,
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(title, '\s+', ' ', 'g'),
              '\s*/\s*\$c\M.*$',
              '',
              'i'
            ),
            '\s*:?\s*\$[a-z]\s*',
            ': ',
            'gi'
          ),
          '(\s*:\s*)+',
          ': ',
          'g'
        ),
        '^:\s*|\s*:\s*$',
        '',
        'g'
      )
    ) as title
  from public.books
  where title ~* '\$[a-z]'
) as cleaned
where books.id = cleaned.id
  and cleaned.title <> ''
  and cleaned.title is distinct from books.title;
