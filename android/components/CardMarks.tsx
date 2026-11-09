import { Download } from "lucide-react-native";
import { View } from "react-native";

import { FavoriteButton } from "@/components/FavoriteButton";
import { useSession } from "@/lib/session";
import type { Book } from "@/lib/types";
import { colors } from "@/theme/tokens";

/** Heart and download mark on a cover. The heart toggles Favorite. */
export function CardMarks({ book, downloaded }: { book: Book; downloaded: boolean }) {
  const { session, favoriteIds, setFavorite } = useSession();
  const signedIn = session.kind === "user";
  const active = signedIn && favoriteIds.includes(book.id);

  return (
    <View style={{ gap: 8, alignItems: "flex-end" }}>
      <FavoriteButton
        title={book.title}
        active={active}
        onPress={() => {
          if (signedIn) setFavorite(book.id, !active);
        }}
      />
      <View
        accessibilityLabel={downloaded ? `${book.title} is on this device` : `${book.title} is not on this device`}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: downloaded ? colors.ink : colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Download color={downloaded ? colors.bg : colors.muted} size={20} strokeWidth={1.5} />
      </View>
    </View>
  );
}
