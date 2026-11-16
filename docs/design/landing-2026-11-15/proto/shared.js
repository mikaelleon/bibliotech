// Prototype data. First lines are copied verbatim from the Project Gutenberg texts of each book.
const DARK = ["#8C3B3F", "#2F4A43", "#1F3A57", "#A24A34", "#56704F", "#3A2430", "#6B5B7A", "#7A6A4F"];
const LIGHT = ["#D9C58A", "#CFC9B8", "#C9D3D6", "#E4D3B4"];
function colors(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  const all = [...DARK.map((b) => ({ background: b, color: "#fff" })), ...LIGHT.map((b) => ({ background: b, color: "#1f2330" }))];
  return all[h % all.length];
}
function rnd(id, salt) {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 33) + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}
const BOOKS = [
  { id: "moby-dick", title: "Moby-Dick", author: "Herman Melville", line: "Call me Ishmael." },
  { id: "pride-and-prejudice", title: "Pride and Prejudice", author: "Jane Austen", line: "It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife." },
  { id: "peter-pan", title: "Peter Pan", author: "J. M. Barrie", line: "All children, except one, grow up." },
  { id: "a-tale-of-two-cities", title: "A Tale of Two Cities", author: "Charles Dickens", line: "It was the best of times, it was the worst of times…" },
  { id: "a-christmas-carol", title: "A Christmas Carol", author: "Charles Dickens", line: "Marley was dead: to begin with." },
  { id: "jane-eyre", title: "Jane Eyre", author: "Charlotte Brontë", line: "There was no possibility of taking a walk that day." },
  { id: "the-great-gatsby", title: "The Great Gatsby", author: "F. Scott Fitzgerald", line: "In my younger and more vulnerable years my father gave me some advice that I’ve been turning over in my mind ever since." },
  { id: "the-art-of-war", title: "The Art of War", author: "Sun Tzu", line: "Sun Tzŭ said: The art of war is of vital importance to the State." },
  { id: "the-time-machine", title: "The Time Machine", author: "H. G. Wells", line: "The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us." },
  { id: "wuthering-heights", title: "Wuthering Heights", author: "Emily Brontë", line: "1801—I have just returned from a visit to my landlord—the solitary neighbour that I shall be troubled with." },
  { id: "little-women", title: "Little Women", author: "Louisa May Alcott", line: "“Christmas won’t be Christmas without any presents,” grumbled Jo, lying on the rug." },
  { id: "the-wonderful-wizard-of-oz", title: "The Wonderful Wizard of Oz", author: "L. Frank Baum", line: "Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer’s wife." },
  { id: "the-yellow-wallpaper", title: "The Yellow Wallpaper", author: "Charlotte Perkins Gilman", line: "It is very seldom that mere ordinary people like John and myself secure ancestral halls for the summer." },
  { id: "great-expectations", title: "Great Expectations", author: "Charles Dickens", line: "My father’s family name being Pirrip, and my Christian name Philip, my infant tongue could make of both names nothing longer or more explicit than Pip." },
].map((b) => ({ ...b, ...colors(b.id), w: Math.round(40 + rnd(b.id, 7) * 22), h: Math.round(232 + rnd(b.id, 13) * 58) }));
