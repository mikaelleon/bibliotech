import { FavoriteButton } from "@/components/FavoriteButton";
import type { ShelfKind } from "@/components/SignUpPrompt";
import { useSession } from "@/lib/session";
import type { Book } from "@/lib/types";

/** Heart in a card's corner. Readers toggle the favorite; guests get the sign-up prompt. */
export function CardFavorite({ book, onLocked }: { book: Book; onLocked: (kind: ShelfKind) => void }) {
  const { session, favoriteIds, setFavorite } = useSession();
  const signedIn = session.kind === "user";
  const active = signedIn && favoriteIds.includes(book.id);
  return (
    <FavoriteButton
      title={book.title}
      active={active}
      onPress={() => (signedIn ? setFavorite(book.id, !active) : onLocked("favorites"))}
    />
  );
}
