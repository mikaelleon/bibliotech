import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FEATURED_LIMIT, rankFeatured, type Engagement } from "./featured.ts";

function book(id: string, title = id) {
  return { id, title };
}

const catalog = [
  book("pride-and-prejudice", "Pride and Prejudice"),
  book("frankenstein", "Frankenstein"),
  book("alice", "Alice's Adventures in Wonderland"),
  book("moby-dick-or-the-whale", "Moby-Dick; or, The Whale"),
  book("opticks", "Opticks"),
  book("walden", "Walden"),
  book("a-christmas-carol-in-prose-being-a-ghost-story-of-christmas", "A Christmas Carol in Prose; Being a Ghost Story of Christmas"),
  book("jane-eyre-an-autobiography", "Jane Eyre: An Autobiography"),
];

describe("rankFeatured", () => {
  it("features only known literature, in recognition order, when nothing has been used", () => {
    const featured = rankFeatured(catalog);
    assert.deepEqual(
      featured.map((item) => item.id),
      [
        "pride-and-prejudice",
        "frankenstein",
        "alice",
        "moby-dick-or-the-whale",
        "jane-eyre-an-autobiography",
        "a-christmas-carol-in-prose-being-a-ghost-story-of-christmas",
      ],
    );
    assert.ok(featured.length <= FEATURED_LIMIT);
    assert.equal(featured.some((item) => item.id === "opticks"), false);
    assert.equal(featured.some((item) => item.id === "walden"), false);
  });

  it("raises a book by downloads, favorites, and library adds, and lets a used book join", () => {
    const scores = new Map<string, Engagement>([
      ["alice", { downloads: 1, favorites: 0, libraryAdds: 0 }],
      ["walden", { downloads: 2, favorites: 1, libraryAdds: 3 }],
      ["opticks", { downloads: 0, favorites: 0, libraryAdds: 0 }],
    ]);
    const featured = rankFeatured(catalog, scores);
    assert.equal(featured[0]?.id, "walden");
    assert.equal(featured[1]?.id, "alice");
    assert.equal(featured.some((item) => item.id === "opticks"), false);
    assert.ok(featured.length <= FEATURED_LIMIT);
  });

  it("keeps one edition when two titles name the same known work", () => {
    const both = [
      book("moby-dick", "Moby-Dick"),
      book("moby-dick-or-the-whale", "Moby-Dick; or, The Whale"),
    ];
    const featured = rankFeatured(both);
    assert.deepEqual(
      featured.map((item) => item.id),
      ["moby-dick"],
    );
  });
});
