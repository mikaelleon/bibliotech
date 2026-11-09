/** A reading list is read through. A collection is a named group. Both live inside Library. */
export type CollectionKind = "reading_list" | "collection";

export type CollectionGroup = {
  id: string;
  name: string;
  kind: CollectionKind;
  bookIds: string[];
};

export function kindLabel(kind: CollectionKind): string {
  return kind === "reading_list" ? "Reading list" : "Collection";
}
