/**
 * The first sentence of each book on the landing shelf, copied verbatim from the Project Gutenberg
 * text linked in the catalog. The array is in shelf order: by author, then by title, the way a
 * library shelves them. A Tale of Two Cities is cut at a clause and marked with an ellipsis. The Art of War
 * prints "Tzu" where the Giles text has a breve, so the display font needs no extra subset for one letter.
 * Titles and authors come from the catalog, so only the line lives here.
 */
export type FirstLine = {
  slug: string;
  /** Name for the spine and the button, when the catalog title carries a subtitle. */
  name?: string;
  line: string;
  /** The line starts with a quotation mark, which hangs in the margin. */
  hang?: boolean;
};

export const FIRST_LINES: FirstLine[] = [
  {
    slug: "little-women",
    line: "“Christmas won’t be Christmas without any presents,” grumbled Jo, lying on the rug.",
    hang: true,
  },
  {
    slug: "meditations",
    line: "Of my grandfather Verus I have learned to be gentle and meek, and to refrain from all anger and passion.",
  },
  {
    slug: "pride-and-prejudice",
    line: "It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife.",
  },
  { slug: "peter-pan", line: "All children, except one, grow up." },
  {
    slug: "the-wonderful-wizard-of-oz",
    line: "Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer’s wife.",
  },
  { slug: "jane-eyre-an-autobiography", name: "Jane Eyre", line: "There was no possibility of taking a walk that day." },
  {
    slug: "wuthering-heights",
    line: "1801—I have just returned from a visit to my landlord—the solitary neighbour that I shall be troubled with.",
  },
  {
    slug: "a-christmas-carol-in-prose-being-a-ghost-story-of-christmas",
    name: "A Christmas Carol",
    line: "Marley was dead: to begin with.",
  },
  { slug: "a-tale-of-two-cities", line: "It was the best of times, it was the worst of times…" },
  {
    slug: "great-expectations",
    line: "My father’s family name being Pirrip, and my Christian name Philip, my infant tongue could make of both names nothing longer or more explicit than Pip.",
  },
  {
    slug: "the-great-gatsby",
    line: "In my younger and more vulnerable years my father gave me some advice that I’ve been turning over in my mind ever since.",
  },
  {
    slug: "the-yellow-wallpaper",
    line: "It is very seldom that mere ordinary people like John and myself secure ancestral halls for the summer.",
  },
  { slug: "moby-dick", line: "Call me Ishmael." },
  {
    slug: "frankenstein",
    line: "You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings.",
  },
  { slug: "the-art-of-war", line: "Sun Tzu said: The art of war is of vital importance to the State." },
  {
    slug: "the-time-machine",
    line: "The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us.",
  },
];

/** The book that opens the page. */
export const START_SLUG = "moby-dick";

export type LineSize = "xl" | "l" | "m" | "s";

/** Longer lines get a smaller size, so every line fills the stage about the same way. */
export function lineSize(line: string): LineSize {
  const length = line.length;
  if (length <= 24) return "xl";
  if (length <= 60) return "l";
  if (length <= 125) return "m";
  return "s";
}

/** Stable 0 to 1 value from an id and a salt, for the small differences between spines. */
export function spineJitter(id: string, salt: number): number {
  let hash = salt;
  for (let index = 0; index < id.length; index += 1) {
    hash = (Math.imul(hash, 33) + id.charCodeAt(index)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

/**
 * One opening sentence for each of the biggest shelves, for the Shelves section. Same source and the
 * same rule as above. Walden is cut at a clause. A shelf with no line here is listed without one.
 */
export type ShelfLine = { category: string; slug: string; line: string };

export const SHELF_LINES: ShelfLine[] = [
  {
    category: "Fiction",
    slug: "pride-and-prejudice",
    line: "It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife.",
  },
  { category: "History", slug: "the-art-of-war", line: "Sun Tzu said: The art of war is of vital importance to the State." },
  { category: "Children", slug: "peter-pan", line: "All children, except one, grow up." },
  { category: "Classics", slug: "jane-eyre-an-autobiography", line: "There was no possibility of taking a walk that day." },
  {
    category: "Science",
    slug: "walden",
    line: "When I wrote the following pages, or rather the bulk of them, I lived alone, in the woods…",
  },
];
