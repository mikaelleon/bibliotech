/** A named shelf inside Library. A book can sit in several. */
export type CollectionGroup = {
  id: string;
  name: string;
  bookIds: string[];
};

/** Where a book sat inside a collection, so Undo can put it back. */
export type Membership = {
  bookId: string;
  collectionId: string;
  position: number;
};

export type ReadingProgress = {
  bookId: string;
  /** 0 to 1. */
  progress: number;
  updatedAt: string;
};
