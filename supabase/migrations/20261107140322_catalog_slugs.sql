-- Phase 2 step 0: give books a stable slug and load the Phase 1 catalog.
--
-- The apps address books by slug (for example /books/pride-and-prejudice), so
-- Library and Favorites rows can point at real books before the catalog
-- importer runs. The importer fills slug for every book it adds.
--
-- Rollback: delete from public.books where slug in (...these slugs...);
--           alter table public.books drop column slug;

alter table public.books add column slug text;
alter table public.books add constraint books_slug_key unique (slug);
alter table public.books add constraint books_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

insert into public.books (
  slug, title, author, category, language, published, license,
  source_name, source_url, summary, summary_short, cover_url
)
values
  ('pride-and-prejudice', 'Pride and Prejudice', 'Jane Austen', 'Fiction', 'English', '1813', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/1342', 'Elizabeth Bennet and Mr. Darcy misjudge each other, then have to live with what they got wrong. The novel follows how pride, money, and a small town shape a marriage.', null, null),
  ('frankenstein', 'Frankenstein', 'Mary Shelley', 'Fiction', 'English', '1818', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/84', 'Frankenstein; or, The Modern Prometheus follows Victor Frankenstein, a young scientist who builds a living creature and then abandons it. The novel traces what each of them does next, and what each owes the other.', 'A young scientist builds a living creature and then abandons it. The novel traces what each of them does next.', null),
  ('moby-dick', 'Moby-Dick', 'Herman Melville', 'Fiction', 'English', '1851', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/2701', 'Ishmael ships on the Pequod and watches Captain Ahab hunt the white whale that took his leg. The book is a voyage, a workplace, and an argument about obsession.', null, null),
  ('alice', 'Alice''s Adventures in Wonderland', 'Lewis Carroll', 'Fiction', 'English', '1865', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/11', 'Alice follows a rabbit underground and meets creatures who treat nonsense as a set of rules. She has to decide which rules are worth keeping.', null, null),
  ('the-art-of-war', 'The Art of War', 'Sun Tzu', 'History', 'English', 'c. 5th century BC', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/132', 'A short manual on when to fight, when to wait, and how to win before the battle starts. It has been read as military history and as advice about conflict.', null, null),
  ('meditations', 'Meditations', 'Marcus Aurelius', 'Education', 'English', 'c. 180', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/2680', 'Private notes from a Roman emperor on how to stay steady when the day goes wrong. He writes to himself about duty, death, and other people.', null, null),
  ('walden', 'Walden', 'Henry David Thoreau', 'Science', 'English', '1854', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/205', 'Thoreau records two years in a cabin by Walden Pond: what he spent, what he watched, and what he thinks a life needs. The book is part nature study and part argument.', null, null),
  ('dracula', 'Dracula', 'Bram Stoker', 'Fiction', 'English', '1897', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/345', 'Jonathan Harker visits a count in Transylvania, and the count then comes to England. Letters and diaries follow the people who try to stop him.', null, null),
  ('the-time-machine', 'The Time Machine', 'H. G. Wells', 'Fiction', 'English', '1895', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/35', 'A Victorian inventor rides a machine far into the future and meets what is left of humanity. The story asks what progress is for.', null, null),
  ('great-expectations', 'Great Expectations', 'Charles Dickens', 'Fiction', 'English', '1861', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/1400', 'Pip, a blacksmith''s boy, is given money and told to become a gentleman. He spends the book learning who paid, and what the gift cost.', null, null),
  ('the-wealth-of-nations', 'The Wealth of Nations', 'Adam Smith', 'Business', 'English', '1776', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/3300', 'Smith explains how labor, trade, and prices build a nation''s wealth. The book is the starting point for a lot of later economics.', null, null),
  ('origin-of-species', 'On the Origin of Species', 'Charles Darwin', 'Science', 'English', '1859', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/1228', 'Darwin sets out how species change through variation and natural selection. He argues from pigeons, islands, and the fossil record.', null, null),
  ('relativity', 'Relativity', 'Albert Einstein', 'Science', 'English', '1916', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/30155', 'Einstein explains special and general relativity for a reader who is not a physicist. He uses trains, light, and a little geometry.', null, null),
  ('voyage-of-the-beagle', 'The Voyage of the Beagle', 'Charles Darwin', 'Science', 'English', '1839', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/944', 'Darwin''s journal from the survey ship Beagle: coasts, fossils, people, and animals he had not seen at home. The trip sits behind his later theory.', null, null),
  ('opticks', 'Opticks', 'Isaac Newton', 'Science', 'English', '1704', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/33504', 'Newton reports experiments on light, color, and the prism. He writes the results as questions a reader can follow without the Principia.', null, null),
  ('experimental-researches', 'Experimental Researches in Electricity', 'Michael Faraday', 'Technology', 'English', '1839', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/14986', 'Faraday''s papers on how electricity and magnetism act on each other. The work is the lab record behind later electric machines.', null, null),
  ('peloponnesian-war', 'History of the Peloponnesian War', 'Thucydides', 'History', 'English', 'c. 400 BC', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/7142', 'Thucydides writes the war between Athens and Sparta as a record of what people did under pressure. Speeches and battles sit next to plague and politics.', null, null),
  ('thoughts-on-education', 'Some Thoughts Concerning Education', 'John Locke', 'Education', 'English', '1693', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/1067', 'Locke advises a friend on raising a child: health, habits, and how to teach without breaking curiosity. It is a practical book, not a school syllabus.', null, null),
  ('leisure-class', 'The Theory of the Leisure Class', 'Thorstein Veblen', 'Business', 'English', '1899', 'Public Domain', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/833', 'Veblen looks at spending that exists to be seen. He traces how status, not need, drives a lot of what people buy.', null, null)

on conflict (slug) do nothing;

alter table public.books alter column slug set not null;
