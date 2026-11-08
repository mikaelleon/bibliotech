import assert from "node:assert/strict";
import test from "node:test";

import { catalogBooks, categoryFor, chooseEdition, flipAuthor, nextHarvestUrl, normalizeKey, parseHarvest, slugify, uniqueSlug } from "./lib.mjs";

test("slugify keeps letters and hyphens", () => {
  assert.equal(slugify("Pride and Prejudice"), "pride-and-prejudice");
  assert.equal(slugify("  The Art of War! "), "the-art-of-war");
});

test("flipAuthor turns Last, First into First Last", () => {
  assert.equal(flipAuthor("Austen, Jane"), "Jane Austen");
  assert.equal(flipAuthor("Austen, Jane, 1775-1817"), "Jane Austen");
  assert.equal(flipAuthor("Kennedy, John F. (John Fitzgerald), 1917-1963"), "John F. Kennedy");
  assert.equal(flipAuthor("Sophocles, 496? BCE-407 BCE"), "Sophocles");
  assert.equal(flipAuthor("Sun Tzu"), "Sun Tzu");
});

test("nextHarvestUrl follows the higher offset", () => {
  const body = '<a href="/robot/harvest?filetypes[]=epub.images&amp;langs[]=en&amp;offset=100">Next</a>';
  const next = nextHarvestUrl(body, "https://www.gutenberg.org/robot/harvest?filetypes[]=epub.images&langs[]=en");
  assert.equal(next, "https://www.gutenberg.org/robot/harvest?filetypes[]=epub.images&langs[]=en&offset=100");
  assert.equal(nextHarvestUrl(body, next), null);
});

test("catalogBooks keeps English text and flips the author", () => {
  const csv = [
    "Text#,Type,Issued,Title,Language,Authors,Subjects,LoCC,Bookshelves",
    '11,Text,2008-06-27,Alice\'s Adventures in Wonderland,en,"Carroll, Lewis, 1832-1898",Fantasy fiction,PR,Children\'s Literature',
    "2,Sound,1972-12-01,Not a book,en,Someone,Speech,,",
    "3,Text,1973-11-01,French only,fr,Someone,Speech,,",
  ].join("\n");
  const books = catalogBooks(csv);
  assert.equal(books.length, 1);
  assert.equal(books[0].id, 11);
  assert.equal(books[0].authors[0].name, "Carroll, Lewis, 1832-1898");
  assert.deepEqual(books[0].bookshelves, ["Children's Literature"]);
});

test("normalizeKey ignores punctuation and case", () => {
  assert.equal(normalizeKey("Pride & Prejudice", "Austen, Jane"), normalizeKey("pride and prejudice", "austen jane"));
});

test("categoryFor checks children before fiction", () => {
  assert.equal(categoryFor(["Juvenile fiction"], []), "Children");
  assert.equal(categoryFor(["Poetry"], []), "Poetry");
  assert.equal(categoryFor(["Science -- Astronomy"], []), "Science");
  assert.equal(categoryFor([], []), "Fiction");
});

test("parseHarvest maps an epub id to its URL", () => {
  const body = "see https://www.gutenberg.org/cache/epub/1342/pg1342-images.epub next";
  const map = parseHarvest(body);
  assert.equal(map.get(1342), "https://www.gutenberg.org/cache/epub/1342/pg1342-images.epub");
});

test("chooseEdition falls back when the images file is over the cap", () => {
  const images = { url: "a", size: 6 * 1024 * 1024 };
  const plain = { url: "b", size: 1000 };
  assert.equal(chooseEdition(images, plain)?.edition, "noimages");
  assert.equal(chooseEdition(images, { url: "b", size: 9 * 1024 * 1024 }), null);
});

test("uniqueSlug adds a number when the slug is taken", () => {
  const taken = new Set(["pride-and-prejudice"]);
  assert.equal(uniqueSlug("Pride and Prejudice", taken), "pride-and-prejudice-2");
});
