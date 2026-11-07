import type { Book, Category } from "@/lib/types";

/**
 * Catalog stand-in. This repo has no database yet.
 * Titles are public-domain books, with a real Project Gutenberg page when the id is known.
 */
const books: Book[] = [
  {
    id: "pride-and-prejudice",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    category: "Fiction",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/1342",
    summary:
      "Elizabeth Bennet and Mr. Darcy misjudge each other, then have to live with what they got wrong. The novel follows how pride, money, and a small town shape a marriage.",
  },
  {
    id: "frankenstein",
    title: "Frankenstein",
    author: "Mary Shelley",
    category: "Fiction",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/84",
    summary:
      "Frankenstein; or, The Modern Prometheus follows Victor Frankenstein, a young scientist who builds a living creature and then abandons it. The novel traces what each of them does next, and what each owes the other.",
    summaryShort:
      "A young scientist builds a living creature and then abandons it. The novel traces what each of them does next.",
  },
  {
    id: "moby-dick",
    title: "Moby-Dick",
    author: "Herman Melville",
    category: "Fiction",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/2701",
    summary:
      "Ishmael ships on the Pequod and watches Captain Ahab hunt the white whale that took his leg. The book is a voyage, a workplace, and an argument about obsession.",
  },
  {
    id: "alice",
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    category: "Fiction",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/11",
    summary:
      "Alice follows a rabbit underground and meets creatures who treat nonsense as a set of rules. She has to decide which rules are worth keeping.",
  },
  {
    id: "the-art-of-war",
    title: "The Art of War",
    author: "Sun Tzu",
    category: "History",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/132",
    summary:
      "A short manual on when to fight, when to wait, and how to win before the battle starts. It has been read as military history and as advice about conflict.",
  },
  {
    id: "meditations",
    title: "Meditations",
    author: "Marcus Aurelius",
    category: "Education",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/2680",
    summary:
      "Private notes from a Roman emperor on how to stay steady when the day goes wrong. He writes to himself about duty, death, and other people.",
  },
  {
    id: "walden",
    title: "Walden",
    author: "Henry David Thoreau",
    category: "Science",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/205",
    summary:
      "Thoreau records two years in a cabin by Walden Pond: what he spent, what he watched, and what he thinks a life needs. The book is part nature study and part argument.",
  },
  {
    id: "dracula",
    title: "Dracula",
    author: "Bram Stoker",
    category: "Fiction",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/345",
    summary:
      "Jonathan Harker visits a count in Transylvania, and the count then comes to England. Letters and diaries follow the people who try to stop him.",
  },
  {
    id: "the-time-machine",
    title: "The Time Machine",
    author: "H. G. Wells",
    category: "Fiction",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/35",
    summary:
      "A Victorian inventor rides a machine far into the future and meets what is left of humanity. The story asks what progress is for.",
  },
  {
    id: "great-expectations",
    title: "Great Expectations",
    author: "Charles Dickens",
    category: "Fiction",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/1400",
    summary:
      "Pip, a blacksmith's boy, is given money and told to become a gentleman. He spends the book learning who paid, and what the gift cost.",
  },
  {
    id: "the-wealth-of-nations",
    title: "The Wealth of Nations",
    author: "Adam Smith",
    category: "Business",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/3300",
    summary:
      "Smith explains how labor, trade, and prices build a nation's wealth. The book is the starting point for a lot of later economics.",
  },
  {
    id: "origin-of-species",
    title: "On the Origin of Species",
    author: "Charles Darwin",
    category: "Science",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/1228",
    summary:
      "Darwin sets out how species change through variation and natural selection. He argues from pigeons, islands, and the fossil record.",
  },
  {
    id: "relativity",
    title: "Relativity",
    author: "Albert Einstein",
    category: "Science",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/30155",
    summary:
      "Einstein explains special and general relativity for a reader who is not a physicist. He uses trains, light, and a little geometry.",
  },
  {
    id: "voyage-of-the-beagle",
    title: "The Voyage of the Beagle",
    author: "Charles Darwin",
    category: "Science",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/944",
    summary:
      "Darwin's journal from the survey ship Beagle: coasts, fossils, people, and animals he had not seen at home. The trip sits behind his later theory.",
  },
  {
    id: "opticks",
    title: "Opticks",
    author: "Isaac Newton",
    category: "Science",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/33504",
    summary:
      "Newton reports experiments on light, color, and the prism. He writes the results as questions a reader can follow without the Principia.",
  },
  {
    id: "experimental-researches",
    title: "Experimental Researches in Electricity",
    author: "Michael Faraday",
    category: "Technology",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/14986",
    summary:
      "Faraday's papers on how electricity and magnetism act on each other. The work is the lab record behind later electric machines.",
  },
  {
    id: "peloponnesian-war",
    title: "History of the Peloponnesian War",
    author: "Thucydides",
    category: "History",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/7142",
    summary:
      "Thucydides writes the war between Athens and Sparta as a record of what people did under pressure. Speeches and battles sit next to plague and politics.",
  },
  {
    id: "thoughts-on-education",
    title: "Some Thoughts Concerning Education",
    author: "John Locke",
    category: "Education",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/1067",
    summary:
      "Locke advises a friend on raising a child: health, habits, and how to teach without breaking curiosity. It is a practical book, not a school syllabus.",
  },
  {
    id: "leisure-class",
    title: "The Theory of the Leisure Class",
    author: "Thorstein Veblen",
    category: "Business",
    language: "English",
    license: "Public Domain",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/833",
    summary:
      "Veblen looks at spending that exists to be seen. He traces how status, not need, drives a lot of what people buy.",
  },
];

const recentIds = [
  "pride-and-prejudice",
  "frankenstein",
  "dracula",
  "great-expectations",
  "the-art-of-war",
  "meditations",
];

const popularScienceIds = [
  "origin-of-species",
  "relativity",
  "voyage-of-the-beagle",
  "opticks",
  "the-time-machine",
  "walden",
];

export function getBooks(): Book[] {
  return books;
}

export function getBook(id: string): Book | undefined {
  return books.find((book) => book.id === id);
}

export function getBooksByIds(ids: string[]): Book[] {
  return ids.flatMap((id) => {
    const book = getBook(id);
    return book ? [book] : [];
  });
}

export function getRecentBooks(): Book[] {
  return getBooksByIds(recentIds);
}

export function getPopularScienceBooks(): Book[] {
  return getBooksByIds(popularScienceIds);
}

export type BookSort = "catalog" | "title" | "author";

export function sortBooks(list: Book[], sort: BookSort): Book[] {
  const next = [...list];
  if (sort === "title") next.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "author") next.sort((a, b) => a.author.localeCompare(b.author));
  return next;
}

export function filterBooks(
  list: Book[],
  query: string,
  category: string | undefined,
): Book[] {
  const needle = query.trim().toLowerCase();
  const selected = category && category !== "All" ? category : "";

  return list.filter((book) => {
    const categoryMatches = selected === "" || book.category === (selected as Category);
    const textMatches =
      needle === "" ||
      book.title.toLowerCase().includes(needle) ||
      book.author.toLowerCase().includes(needle);
    return categoryMatches && textMatches;
  });
}

export function relatedBooks(book: Book): Book[] {
  return books.filter((item) => item.category === book.category && item.id !== book.id).slice(0, 6);
}
