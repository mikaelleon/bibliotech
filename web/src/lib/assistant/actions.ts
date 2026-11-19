/**
 * Shelf actions the assistant may PROPOSE. The model cannot run any of them: the server checks
 * each proposal against the real catalog and the reader's real shelf, labels it from trusted
 * data, and the reader confirms it on a card. The confirmed action then runs through the same
 * authorized server actions as the heart and Library buttons (session check + row level security).
 * Downloads, progress, account and admin changes are deliberately not available here.
 */

export type ActionType =
  | "add_library"
  | "remove_library"
  | "favorite"
  | "unfavorite"
  | "add_to_collection"
  | "create_collection";

export type ActionProposal = {
  /** Stable key for the card. */
  id: string;
  type: ActionType;
  slug?: string;
  /** Catalog title, never model text. */
  title?: string;
  /** Set when the target collection already exists. */
  collectionId?: string;
  collectionName?: string;
  /** Sentence shown on the card, built here from trusted values. */
  label: string;
};

export type ShelfState = {
  /** Catalog slugs, newest first. */
  library: string[];
  favorites: string[];
  collections: { id: string; name: string; slugs: string[] }[];
};

export const EMPTY_SHELF: ShelfState = { library: [], favorites: [], collections: [] };

const BOOK_TYPES = new Set<ActionType>(["add_library", "remove_library", "favorite", "unfavorite"]);
const MAX_ACTIONS = 3;
const MAX_NAME = 80;

/** Collection names are typed by the model: strip markers and control characters, then clip. */
export function cleanName(value: string): string {
  return value
    .replace(/\[\[|\]\]/g, "")
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME);
}

/**
 * Turns raw `type | slug | name` strings from the model into proposals that are valid and not
 * already true: you can't add a book that is already on the shelf, or remove one that isn't.
 */
export function parseActions(
  raw: string[],
  catalog: ReadonlyMap<string, { title: string }>,
  shelf: ShelfState,
): ActionProposal[] {
  const out: ActionProposal[] = [];
  const seen = new Set<string>();

  for (const line of raw) {
    if (out.length >= MAX_ACTIONS) break;
    const parts = line.split("|").map((p) => p.replace(/\s+/g, " ").trim());
    const type = parts[0]?.toLowerCase() as ActionType;

    let proposal: ActionProposal | null = null;

    if (BOOK_TYPES.has(type)) {
      const slug = parts[1] ?? "";
      const title = catalog.get(slug)?.title;
      if (!title) continue;
      const inLibrary = shelf.library.includes(slug);
      const isFavorite = shelf.favorites.includes(slug);
      if (type === "add_library" && !inLibrary) {
        proposal = { id: `${type}:${slug}`, type, slug, title, label: `Add “${title}” to your Library` };
      } else if (type === "remove_library" && inLibrary) {
        proposal = { id: `${type}:${slug}`, type, slug, title, label: `Remove “${title}” from your Library` };
      } else if (type === "favorite" && !isFavorite) {
        proposal = { id: `${type}:${slug}`, type, slug, title, label: `Add “${title}” to your favorites` };
      } else if (type === "unfavorite" && isFavorite) {
        proposal = { id: `${type}:${slug}`, type, slug, title, label: `Remove “${title}” from your favorites` };
      }
    } else if (type === "add_to_collection") {
      const slug = parts[1] ?? "";
      const title = catalog.get(slug)?.title;
      const name = cleanName(parts[2] ?? "");
      if (!title || !name) continue;
      const existing = shelf.collections.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (existing?.slugs.includes(slug)) continue;
      proposal = existing
        ? {
            id: `${type}:${slug}:${existing.id}`,
            type,
            slug,
            title,
            collectionId: existing.id,
            collectionName: existing.name,
            label: `Add “${title}” to your “${existing.name}” collection`,
          }
        : {
            id: `${type}:${slug}:new:${name.toLowerCase()}`,
            type,
            slug,
            title,
            collectionName: name,
            label: `Create the collection “${name}” and add “${title}”`,
          };
    } else if (type === "create_collection") {
      const name = cleanName(parts[1] ?? "");
      if (!name || shelf.collections.some((c) => c.name.toLowerCase() === name.toLowerCase())) continue;
      proposal = {
        id: `${type}:${name.toLowerCase()}`,
        type,
        collectionName: name,
        label: `Create the collection “${name}”`,
      };
    }

    if (proposal && !seen.has(proposal.id)) {
      seen.add(proposal.id);
      out.push(proposal);
    }
  }
  return out;
}
