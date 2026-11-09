import { useNetworkState } from "expo-network";
import { ChevronLeft, ChevronRight, Library } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BookCard } from "@/components/BookCard";
import { CardMarks } from "@/components/CardMarks";
import { FadeIn, useFreshList } from "@/components/FadeIn";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { LockedPanel } from "@/components/LockedPanel";
import { PageHeader } from "@/components/PageHeader";
import { getBook } from "@/lib/books";
import { useCatalogBooks } from "@/lib/catalog";
import { createGroup, deleteGroup, loadCollections, type CollectionGroup, type CollectionKind } from "@/lib/collections";
import { forgetBook, localBooks, type LocalBook } from "@/lib/local-books";
import { useSession } from "@/lib/session";
import type { Book } from "@/lib/types";
import { colors, font, radius } from "@/theme/tokens";

type ViewName = "library" | "reading_list" | "collection" | "downloaded";

const pages: { id: ViewName; label: string }[] = [
  { id: "library", label: "Library" },
  { id: "reading_list", label: "Reading lists" },
  { id: "collection", label: "Collections" },
  { id: "downloaded", label: "Downloaded" },
];

export default function LibraryScreen() {
  const { session, libraryIds, setFavorite, setInLibrary } = useSession();
  const fresh = useFreshList();
  const [page, setPage] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [groups, setGroups] = useState<CollectionGroup[]>([]);
  const [groupName, setGroupName] = useState("");
  const userId = session.kind === "user" ? session.id : "";
  const [local, setLocal] = useState<LocalBook[]>(() => localBooks(userId));
  useCatalogBooks();
  const network = useNetworkState();
  useEffect(() => {
    if (!userId) return;
    void loadCollections(userId).then(setGroups);
  }, [userId]);
  if (session.kind !== "user") return <LockedPanel title="Library" />;

  const view = pages[page]?.id ?? "library";

  const offline = network.isInternetReachable === false;
  const onDevice = new Set(local.map((item) => item.bookId));
  const books = libraryIds
    .map((id) => getBook(id))
    .filter((book) => book !== undefined)
    .filter((book) => !offline || onDevice.has(book.id));
  const count = books.length === 1 ? "1 book in your Library" : `${books.length} books in your Library`;

  function reload() {
    setLocal(localBooks(userId));
  }

  function changeView(next: number) {
    setPage(Math.min(Math.max(next, 0), pages.length - 1));
    setSelecting(false);
    setSelected([]);
  }

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function begin(id: string) {
    setSelecting(true);
    setSelected((current) => (current.includes(id) ? current : [...current, id]));
  }

  function cancel() {
    setSelecting(false);
    setSelected([]);
  }

  function favoriteSelected() {
    for (const id of selected) setFavorite(id, true);
    cancel();
  }

  function librarySelected() {
    const remove = selected.length > 0 && selected.every((id) => libraryIds.includes(id));
    for (const id of selected) setInLibrary(id, !remove);
    cancel();
  }

  function deleteSelected() {
    for (const id of selected) {
      if (onDevice.has(id)) forgetBook(userId, id);
      else setInLibrary(id, false);
    }
    reload();
    cancel();
  }

  function asBook(item: LocalBook): Book {
    return getBook(item.bookId) ?? {
      id: item.bookId,
      title: item.title,
      author: item.author,
      category: "Fiction",
      language: "English",
      license: "Public domain",
      sourceName: "",
      sourceUrl: "",
      summary: "",
    };
  }

  function deviceGrid(items: LocalBook[]) {
    return (
      <View style={styles.grid}>
        {items.map((item) => {
          const book = asBook(item);
          return (
            <View key={item.bookId} style={styles.gridCell}>
              <BookCard
                book={book}
                showCategory
                selected={selected.includes(item.bookId)}
                onLongPress={() => begin(item.bookId)}
                onPress={selecting ? () => toggle(item.bookId) : undefined}
                corner={selecting ? undefined : <CardMarks book={book} downloaded />}
              />
            </View>
          );
        })}
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <PageHeader
        title="Library"
        lede={view === "downloaded" ? "Books saved on this device." : view === "reading_list" ? "Lists you can read through." : view === "collection" ? "Named groups inside your Library." : count}
      />
      <LibraryPager index={page} onChange={changeView} />
    </View>
  );

  return (
    <View style={styles.wrap}>
      {view === "library" ? (
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.page}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState
              icon={<Library color={colors.muted} size={24} strokeWidth={1.5} />}
              title="Your Library is empty"
              action={<Button label="Browse books" href="/browse" variant="outline" />}
            >
              Open a book and choose Add to Library. It doesn’t use a download.
            </EmptyState>
          }
          columnWrapperStyle={books.length > 0 ? styles.row : undefined}
          extraData={selected.join(",")}
          renderItem={({ item, index }) => (
            <FadeIn index={index} skip={!fresh} style={styles.cell}>
              <BookCard
                book={item}
                showCategory
                selected={selected.includes(item.id)}
                onLongPress={() => begin(item.id)}
                onPress={selecting ? () => toggle(item.id) : undefined}
                corner={selecting ? undefined : <CardMarks book={item} downloaded={onDevice.has(item.id)} />}
              />
            </FadeIn>
          )}
        />
      ) : view === "downloaded" ? (
        <ScrollView contentContainerStyle={styles.page}>
          {header}
          {local.length === 0 ? (
            <EmptyState
              icon={<Library color={colors.muted} size={24} strokeWidth={1.5} />}
              title="Nothing on this device yet"
              action={<Button label="Browse books" href="/browse" variant="outline" />}
            >
              A download saves the book here. It stays in download history if this device clears it.
            </EmptyState>
          ) : (
            deviceGrid(local)
          )}
        </ScrollView>
      ) : (
        <GroupView
          kind={view}
          groups={groups.filter((group) => group.kind === view)}
          name={groupName}
          onName={setGroupName}
          onCreate={async () => {
            const created = await createGroup(userId, groupName, view);
            if ("error" in created) return created.error;
            setGroupName("");
            setGroups(await loadCollections(userId));
          }}
          onDelete={async (id) => {
            await deleteGroup(userId, id);
            setGroups(await loadCollections(userId));
          }}
          header={header}
        />
      )}
      {selecting ? (
        <View style={styles.bulk}>
          <Text style={styles.note}>{selected.length === 1 ? "1 selected" : `${selected.length} selected`}</Text>
          <View style={styles.bulkRow}>
            <Button label="Favorite" variant="outline" disabled={selected.length === 0} onPress={favoriteSelected} />
            <Button
              label={selected.length > 0 && selected.every((id) => libraryIds.includes(id)) ? "Remove from Library" : "Add to Library"}
              variant="outline"
              disabled={selected.length === 0}
              onPress={librarySelected}
            />
            <Button label="Delete" disabled={selected.length === 0} onPress={deleteSelected} />
            <Button label="Cancel" variant="outline" onPress={cancel} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function LibraryPager({ index, onChange }: { index: number; onChange: (next: number) => void }) {
  const current = pages[index] ?? pages[0];
  return (
    <View style={styles.pager}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous page" disabled={index === 0} onPress={() => onChange(index - 1)} style={styles.toggleItem}>
        <ChevronLeft color={colors.ink} size={20} strokeWidth={1.5} />
      </Pressable>
      <View>
        <Text style={styles.toggleLabel}>{current.label}</Text>
        <Text style={styles.note}>{index + 1} of {pages.length}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Next page" disabled={index === pages.length - 1} onPress={() => onChange(index + 1)} style={styles.toggleItem}>
        <ChevronRight color={colors.ink} size={20} strokeWidth={1.5} />
      </Pressable>
    </View>
  );
}

function GroupView({
  kind,
  groups,
  name,
  onName,
  onCreate,
  onDelete,
  header,
}: {
  kind: CollectionKind;
  groups: CollectionGroup[];
  name: string;
  onName: (value: string) => void;
  onCreate: () => Promise<string | void> | string | void;
  onDelete: (id: string) => void;
  header: ReactNode;
}) {
  const [problem, setProblem] = useState("");
  return (
    <ScrollView contentContainerStyle={styles.page}>
      {header}
      <TextInput value={name} onChangeText={onName} placeholder={kind === "reading_list" ? "New reading list" : "New collection"} placeholderTextColor={colors.muted} style={styles.input} />
      <Button
        label="Create"
        disabled={name.trim().length === 0}
        onPress={() => {
          void Promise.resolve(onCreate()).then((message) => setProblem(message ?? ""));
        }}
      />
      {problem ? <Text style={styles.note}>{problem}</Text> : null}
      {groups.length === 0 ? <Text style={styles.note}>Nothing here yet.</Text> : null}
      {groups.map((group) => (
        <View key={group.id} style={styles.deviceBlock}>
          <View style={styles.groupHead}>
            <Text style={styles.book}>{group.name}</Text>
            <Button label="Delete" variant="outline" onPress={() => onDelete(group.id)} />
          </View>
          <Text style={styles.note}>{group.bookIds.length === 1 ? "1 book" : `${group.bookIds.length} books`}</Text>
          <View style={styles.grid}>
            {group.bookIds.map((id) => {
              const book = getBook(id);
              if (!book) return null;
              return (
                <View key={id} style={styles.gridCell}>
                  <BookCard book={book} showCategory />
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  page: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    marginBottom: 8,
    gap: 12,
  },
  row: {
    gap: 16,
  },
  cell: {
    flex: 1,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  gridCell: { width: "47%", gap: 8 },
  bulk: { gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  bulkRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  note: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  book: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: colors.ink },
  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: radius.panel, paddingHorizontal: 12, color: colors.ink, fontFamily: font.sans },
  deviceRow: { gap: 8 },
  groupHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  deviceBlock: { gap: 16 },
  toggle: { flexDirection: "row", gap: 8 },
  toggleItem: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: colors.primary },
  toggleLabel: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  toggleLabelOn: { color: colors.onPrimary },
});
