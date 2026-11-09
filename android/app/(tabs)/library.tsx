import { useNetworkState } from "expo-network";
import { useRouter, type Href } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { BookOpen, Check, ChevronLeft, Clock, Filter, LayoutGrid, Library, List, MoreHorizontal, Plus, Type, UserRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AddToLibraryModal } from "@/components/AddToLibraryModal";
import { BookCard } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { LockedPanel } from "@/components/LockedPanel";
import { PageHeader } from "@/components/PageHeader";
import { Toast, type ToastItem } from "@/components/Toast";
import { getBook } from "@/lib/books";
import { useCatalogBooks } from "@/lib/catalog";
import {
  addBookToGroup,
  createGroup,
  deleteGroup,
  listMemberships,
  loadCollections,
  removeBooksFromCollection,
  renameGroup,
  restoreMemberships,
  type CollectionGroup,
} from "@/lib/collections";
import { requestDownload } from "@/lib/download-api";
import { downloadBookFile, forgetBook, localBooks, rememberBook, type LocalBook } from "@/lib/local-books";
import { loadProgress, setProgressMark, type ReadingProgress } from "@/lib/progress";
import { useSession } from "@/lib/session";
import type { Book } from "@/lib/types";
import { colors, font, radius } from "@/theme/tokens";

type ViewName = "all" | "reading" | "finished" | "collections" | "on-device";

const tabs: { id: ViewName; label: string }[] = [
  { id: "all", label: "All" },
  { id: "reading", label: "Reading" },
  { id: "finished", label: "Finished" },
  { id: "collections", label: "Collections" },
  { id: "on-device", label: "On this device" },
];

const sorts = [
  { id: "read", label: "Recently read", Icon: BookOpen },
  { id: "added", label: "Recently added", Icon: Clock },
  { id: "title", label: "Title", Icon: Type },
  { id: "author", label: "Author", Icon: UserRound },
];

export default function LibraryScreen() {
  const router = useRouter();
  const { session, libraryIds, favoriteIds, setFavorite, setInLibrary } = useSession();
  const network = useNetworkState();
  useCatalogBooks();
  const userId = session.kind === "user" ? session.id : "";
  const [view, setView] = useState<ViewName>("all");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [groups, setGroups] = useState<CollectionGroup[]>([]);
  const [marks, setMarks] = useState<Record<string, ReadingProgress>>({});
  const [local, setLocal] = useState<LocalBook[]>(() => localBooks(userId));
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState("added");
  const [sortOpen, setSortOpen] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [menuBook, setMenuBook] = useState<Book | null>(null);
  const [picking, setPicking] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<CollectionGroup | null>(null);
  const [rename, setRename] = useState("");
  const [deleting, setDeleting] = useState<CollectionGroup | null>(null);
  const [groupMenu, setGroupMenu] = useState<CollectionGroup | null>(null);
  const [notice, setNotice] = useState<ToastItem | null>(null);

  useEffect(() => {
    if (!userId) return;
    void loadCollections(userId).then(setGroups);
    void loadProgress(userId).then((rows) => {
      setMarks(Object.fromEntries(rows.map((row) => [row.bookId, row])));
      if (rows.some((row) => row.progress > 0)) setSort("read");
    });
    void SecureStore.getItemAsync("elib.library.layout")
      .then((value) => {
        if (value === "list" || value === "grid") setLayout(value);
      })
      .catch(() => undefined);
  }, [userId]);

  if (session.kind !== "user") return <LockedPanel title="Library" />;

  const offline = network.isInternetReachable === false;
  const onDevice = new Set(local.map((item) => item.bookId));
  const shelfBooks = libraryIds.map((id) => getBook(id)).filter((book): book is Book => book !== undefined);
  const readingCount = shelfBooks.filter((book) => {
    const value = marks[book.id]?.progress ?? 0;
    return value > 0 && value < 1;
  }).length;
  const lede = readingCount > 0 ? `${readingCount} reading · ${libraryIds.length} in Library` : `${libraryIds.length} in Library`;
  const openGroup = collectionId ? groups.find((group) => group.id === collectionId) : undefined;

  function progressOf(id: string): number | undefined {
    const value = marks[id]?.progress;
    if (value === undefined || value <= 0) return undefined;
    return value;
  }

  function order(list: Book[]): Book[] {
    const next = [...list];
    if (sort === "title") next.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "author") next.sort((a, b) => a.author.localeCompare(b.author));
    else if (sort === "read") next.sort((a, b) => (marks[b.id]?.updatedAt ?? "").localeCompare(marks[a.id]?.updatedAt ?? ""));
    return next;
  }

  function asBook(item: LocalBook): Book {
    return (
      getBook(item.bookId) ?? {
        id: item.bookId,
        title: item.title,
        author: item.author,
        category: "Fiction",
        language: "English",
        license: "Public domain",
        sourceName: "",
        sourceUrl: "",
        summary: "",
      }
    );
  }

  const deviceBooks = local.map(asBook);
  const pool =
    view === "on-device"
      ? deviceBooks
      : view === "reading"
        ? shelfBooks.filter((book) => {
            const value = marks[book.id]?.progress ?? 0;
            return value > 0 && value < 1;
          })
        : view === "finished"
          ? shelfBooks.filter((book) => (marks[book.id]?.progress ?? 0) >= 1)
          : view === "collections" && openGroup
            ? shelfBooks.filter((book) => openGroup.bookIds.includes(book.id))
            : shelfBooks;
  const shown = order(pool);
  const continueReading =
    view === "all"
      ? order(
          shelfBooks.filter((book) => {
            const value = marks[book.id]?.progress ?? 0;
            return value > 0 && value < 1;
          }),
        ).slice(0, 6)
      : [];

  function changeView(next: ViewName) {
    setView(next);
    setCollectionId(null);
    setSelecting(false);
    setSelected([]);
  }

  function toast(message: string, actionLabel?: string, onAction?: () => void) {
    setNotice({ id: Date.now(), message, actionLabel, onAction });
  }

  async function removeFromLibrary(ids: string[]) {
    const memberships = await listMemberships(ids);
    for (const id of ids) await setInLibrary(id, false);
    const groupsHit = new Set(memberships.map((row) => row.collectionId)).size;
    const message =
      ids.length === 1
        ? groupsHit === 0
          ? "Removed from Library"
          : `Removed from Library and ${groupsHit === 1 ? "1 collection" : `${groupsHit} collections`}`
        : groupsHit === 0
          ? `Removed ${ids.length} books from Library`
          : `Removed ${ids.length} books from Library and ${groupsHit === 1 ? "1 collection" : `${groupsHit} collections`}`;
    toast(message, "Undo", () => {
      for (const id of ids) void setInLibrary(id, true);
      void restoreMemberships(memberships);
    });
  }

  const selectedBooks = shown.filter((book) => selected.includes(book.id));
  const allFavorite = selectedBooks.length > 0 && selectedBooks.every((book) => favoriteIds.includes(book.id));
  const anyOnDevice = selectedBooks.some((book) => onDevice.has(book.id));
  const deviceBytes = local.reduce((sum, row) => sum + row.size, 0);

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.page}>
        <PageHeader title="Library" lede={lede} />
        <View style={styles.tools}>
          {view === "collections" && !openGroup ? (
            <Pressable accessibilityRole="button" accessibilityLabel="New collection" onPress={() => setCreating(true)} style={styles.iconBtn}>
              <Plus color={colors.ink} size={16} strokeWidth={1.5} />
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setSelecting(true)} style={styles.tool}>
              <Text style={styles.toolLabel}>Select</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Filter" onPress={() => setSortOpen(true)} style={styles.iconBtn}>
            <Filter color={colors.ink} size={16} strokeWidth={1.5} />
          </Pressable>
          <Pressable accessibilityLabel="Grid" accessibilityState={{ selected: layout === "grid" }} onPress={() => { setLayout("grid"); void SecureStore.setItemAsync("elib.library.layout", "grid").catch(() => undefined); }} style={styles.iconBtn}>
            <LayoutGrid color={colors.ink} size={16} strokeWidth={1.5} />
          </Pressable>
          <Pressable accessibilityLabel="List" accessibilityState={{ selected: layout === "list" }} onPress={() => { setLayout("list"); void SecureStore.setItemAsync("elib.library.layout", "list").catch(() => undefined); }} style={styles.iconBtn}>
            <List color={colors.ink} size={16} strokeWidth={1.5} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((tab) => {
            const on = tab.id === view;
            return (
              <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => changeView(tab.id)} style={[styles.tab, on && styles.tabOn]}>
                <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {offline ? <Text style={styles.note}>{"You're offline. "}{local.length === 1 ? "1 book" : `${local.length} books`}{" on this device can be read."}</Text> : null}
        {view === "on-device" ? (
          <Text style={styles.note}>
            {local.length === 1 ? "1 book" : `${local.length} books`} · {deviceBytes < 1024 * 1024 ? `${Math.max(1, Math.round(deviceBytes / 1024))} KB` : `${(deviceBytes / (1024 * 1024)).toFixed(1)} MB`} on this device. Files saved on this device for offline reading.
          </Text>
        ) : null}
        {openGroup ? (
          <Pressable accessibilityRole="link" onPress={() => setCollectionId(null)} style={styles.tool}>
            <ChevronLeft color={colors.ink} size={16} strokeWidth={1.5} />
            <Text style={styles.toolLabel}>Back</Text>
          </Pressable>
        ) : null}
        {continueReading.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.heading}>Continue reading</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowGap}>
              {continueReading.map((book) => (
                <View key={book.id} style={styles.continue}>
                  <BookCover book={book} decorative />
                  <Text numberOfLines={2} style={styles.book}>{book.title}</Text>
                  <View style={styles.track}><View style={[styles.fill, { width: `${Math.round((marks[book.id]?.progress ?? 0) * 100)}%` }]} /></View>
                  <Text style={styles.note}>{Math.round((marks[book.id]?.progress ?? 0) * 100)}%</Text>
                  <Button label="Resume" variant="outline" onPress={() => router.push(`/read/${book.id}` as Href)} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
        {view === "collections" && !openGroup ? (
          groups.length === 0 ? (
            <EmptyState icon={<Library color={colors.muted} size={24} strokeWidth={1.5} />} title="No collections yet" action={<Button label="New collection" variant="outline" onPress={() => setCreating(true)} />}>
              Group books, like Poetry or Summer reading.
            </EmptyState>
          ) : (
            groups.map((group) => {
              const covers = group.bookIds.slice(0, 3).map((id) => getBook(id)).filter((book): book is Book => book !== undefined);
              return (
                <View key={group.id} style={styles.groupRow}>
                  <Pressable accessibilityRole="link" onPress={() => setCollectionId(group.id)} style={styles.groupMain}>
                    <Text style={styles.book}>{group.name}</Text>
                    <Text style={styles.note}>{group.bookIds.length === 1 ? "1 book" : `${group.bookIds.length} books`}</Text>
                    {covers.length > 0 ? (
                      <View style={styles.covers}>
                        {covers.map((book) => (
                          <View key={book.id} style={styles.mini}>
                            <BookCover book={book} decorative />
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                  <Pressable accessibilityLabel={`Actions for ${group.name}`} onPress={() => setGroupMenu(group)} style={styles.iconBtn}>
                    <MoreHorizontal color={colors.ink} size={16} strokeWidth={1.5} />
                  </Pressable>
                </View>
              );
            })
          )
        ) : shown.length === 0 && view === "all" ? (
          <EmptyState icon={<Library color={colors.muted} size={24} strokeWidth={1.5} />} title="Your Library is empty" action={<Button label="Browse books" href="/browse" variant="outline" />}>
            {"Open a book and choose Add to Library. It doesn't use a download."}
          </EmptyState>
        ) : shown.length === 0 && view === "reading" ? (
          <EmptyState icon={<Library color={colors.muted} size={24} strokeWidth={1.5} />} title="Nothing in progress" action={<Button label="Browse your Library" variant="outline" onPress={() => changeView("all")} />}>
            Open a book from your Library to start.
          </EmptyState>
        ) : shown.length === 0 && view === "finished" ? (
          <EmptyState icon={<Library color={colors.muted} size={24} strokeWidth={1.5} />} title="No finished books yet">
            Books you finish show up here.
          </EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState icon={<Library color={colors.muted} size={24} strokeWidth={1.5} />} title="Nothing on this device yet" action={<Button label="Browse your Library" variant="outline" onPress={() => changeView("all")} />}>
            Download a book from its page to read it offline here.
          </EmptyState>
        ) : (
          <View style={styles.block}>
            {view === "all" ? <Text style={styles.heading}>All books</Text> : null}
            <View style={layout === "grid" ? styles.grid : styles.list}>
              {shown.map((book) => {
                const blocked = offline && !onDevice.has(book.id);
                const progress = progressOf(book.id);
                const toggle = () => setSelected((current) => (current.includes(book.id) ? current.filter((item) => item !== book.id) : [...current, book.id]));
                const startSelect = () => {
                  setSelecting(true);
                  setSelected((current) => (current.includes(book.id) ? current : [...current, book.id]));
                };
                if (layout === "list") {
                  return (
                    <Pressable
                      key={book.id}
                      accessibilityRole="button"
                      accessibilityLabel={selecting ? `${selected.includes(book.id) ? "Deselect" : "Select"} ${book.title}` : book.title}
                      onLongPress={startSelect}
                      onPress={selecting ? toggle : blocked ? () => undefined : () => router.push(`/book/${book.id}` as Href)}
                      style={[styles.listItem, blocked && styles.dim]}
                    >
                      <View style={styles.listCover}><BookCover book={book} decorative /></View>
                      <View style={styles.groupMain}>
                        <Text numberOfLines={1} style={styles.book}>{book.title}</Text>
                        <Text numberOfLines={1} style={styles.note}>{book.author}</Text>
                        {progress !== undefined ? <Text style={styles.note}>{progress >= 1 ? "Finished" : `${Math.round(progress * 100)}%`}</Text> : null}
                        {onDevice.has(book.id) ? (
                          <View style={styles.deviceLine}>
                            <Check color={colors.muted} size={12} strokeWidth={2} />
                            <Text style={styles.note}>On this device</Text>
                          </View>
                        ) : null}
                      </View>
                      {selecting ? null : (
                        <Pressable accessibilityRole="button" accessibilityLabel={`Actions for ${book.title}`} onPress={() => setMenuBook(book)} style={styles.iconBtn}>
                          <MoreHorizontal color={colors.ink} size={16} strokeWidth={1.5} />
                        </Pressable>
                      )}
                    </Pressable>
                  );
                }
                return (
                  <View key={book.id} style={[styles.gridCell, blocked && styles.dim]}>
                    <BookCard
                      book={book}
                      showCategory
                      progress={progress}
                      onDevice={onDevice.has(book.id)}
                      selecting={selecting}
                      selected={selected.includes(book.id)}
                      onLongPress={startSelect}
                      onPress={selecting ? toggle : blocked ? () => undefined : undefined}
                      corner={
                        selecting ? undefined : (
                          <Pressable accessibilityRole="button" accessibilityLabel={`Actions for ${book.title}`} onPress={() => setMenuBook(book)} style={styles.menuBtn}>
                            <MoreHorizontal color={colors.ink} size={16} strokeWidth={1.5} />
                          </Pressable>
                        )
                      }
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
      {selecting ? (
        <View accessibilityRole="toolbar" style={styles.bar}>
          <Text style={styles.note}>{selected.length} selected</Text>
          <View style={styles.bulk}>
            <Button label="Add to collection" variant="outline" disabled={selected.length === 0} onPress={() => setPicking(selected)} />
            <Button
              label={allFavorite ? "Remove from favorites" : "Favorite"}
              variant="outline"
              disabled={selected.length === 0}
              onPress={() => {
                for (const id of selected) setFavorite(id, !allFavorite);
                setSelecting(false);
                setSelected([]);
              }}
            />
            {anyOnDevice ? (
              <Button
                label="Remove download"
                variant="outline"
                onPress={() => {
                  const ids = selected.filter((id) => onDevice.has(id));
                  for (const id of ids) forgetBook(userId, id);
                  setLocal(localBooks(userId));
                  toast(ids.length === 1 ? "Removed download. It stays in your Library." : "Removed downloads. They stay in your Library.");
                  setSelecting(false);
                  setSelected([]);
                }}
              />
            ) : null}
            <Button
              label={openGroup ? `Remove from ${openGroup.name}` : "Remove from Library"}
              disabled={selected.length === 0}
              onPress={() => {
                const ids = [...selected];
                if (openGroup) {
                  const previous = openGroup.bookIds;
                  setGroups((rows) => rows.map((item) => (item.id === openGroup.id ? { ...item, bookIds: item.bookIds.filter((id) => !ids.includes(id)) } : item)));
                  void removeBooksFromCollection(userId, openGroup.id, ids).then((ok) => {
                    if (!ok) setGroups((rows) => rows.map((item) => (item.id === openGroup.id ? { ...item, bookIds: previous } : item)));
                    else toast(`Removed from ${openGroup.name}`, "Undo", () => {
                      setGroups((rows) => rows.map((item) => (item.id === openGroup.id ? { ...item, bookIds: previous } : item)));
                      for (const id of ids) void addBookToGroup(userId, openGroup.id, id);
                    });
                  });
                } else void removeFromLibrary(ids);
                setSelecting(false);
                setSelected([]);
              }}
            />
            <Button label="Done" variant="outline" onPress={() => { setSelecting(false); setSelected([]); }} />
          </View>
        </View>
      ) : null}
      <AddToLibraryModal visible={picking.length > 0} userId={userId} bookIds={picking} onClose={() => { setPicking([]); void loadCollections(userId).then(setGroups); }} />
      <Modal visible={groupMenu !== null} transparent animationType="fade" onRequestClose={() => setGroupMenu(null)}>
        <Pressable style={styles.scrim} onPress={() => setGroupMenu(null)}>
          <Pressable style={styles.card} onPress={() => undefined}>
            <Button label="Rename" variant="outline" onPress={() => { if (!groupMenu) return; setRenaming(groupMenu); setRename(groupMenu.name); setGroupMenu(null); }} />
            <Button label="Delete" onPress={() => { if (!groupMenu) return; setDeleting(groupMenu); setGroupMenu(null); }} />
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={menuBook !== null} transparent animationType="fade" onRequestClose={() => setMenuBook(null)}>
        <Pressable style={styles.scrim} onPress={() => setMenuBook(null)}>
          <Pressable style={styles.card} onPress={() => undefined}>
            {menuBook && progressOf(menuBook.id) !== undefined && (progressOf(menuBook.id) ?? 1) < 1 ? (
              <Button label="Resume" variant="outline" onPress={() => { router.push(`/read/${menuBook.id}` as Href); setMenuBook(null); }} />
            ) : null}
            <Button label="Add to collection" variant="outline" onPress={() => { if (menuBook) setPicking([menuBook.id]); setMenuBook(null); }} />
            <Button label={menuBook && favoriteIds.includes(menuBook.id) ? "Remove from favorites" : "Favorite"} variant="outline" onPress={() => { if (menuBook) setFavorite(menuBook.id, !favoriteIds.includes(menuBook.id)); setMenuBook(null); }} />
            {menuBook && onDevice.has(menuBook.id) ? (
              <Button label="Remove download" variant="outline" onPress={() => { if (!menuBook) return; forgetBook(userId, menuBook.id); setLocal(localBooks(userId)); toast("Removed download. It stays in your Library."); setMenuBook(null); }} />
            ) : (
              <Button label="Download" variant="outline" onPress={() => { if (menuBook) void downloadOne(menuBook); }} />
            )}
            <Button
              label={menuBook && (progressOf(menuBook.id) ?? 0) >= 1 ? "Mark as unread" : "Mark as finished"}
              variant="outline"
              onPress={() => {
                if (!menuBook) return;
                const next = (progressOf(menuBook.id) ?? 0) >= 1 ? 0 : 1;
                setMarks((current) => ({ ...current, [menuBook.id]: { bookId: menuBook.id, progress: next, updatedAt: new Date().toISOString() } }));
                void setProgressMark(userId, menuBook.id, next);
                setMenuBook(null);
              }}
            />
            <Button label="Remove from Library" onPress={() => { if (!menuBook) return; const id = menuBook.id; setMenuBook(null); void removeFromLibrary([id]); }} />
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={creating || renaming !== null} transparent animationType="fade" onRequestClose={() => { setCreating(false); setRenaming(null); }}>
        <Pressable style={styles.scrim} onPress={() => { setCreating(false); setRenaming(null); }}>
          <Pressable style={styles.card} onPress={() => undefined}>
            <Text style={styles.heading}>{renaming ? "Rename collection" : "New collection"}</Text>
            <Text style={styles.note}>Name</Text>
            <TextInput value={renaming ? rename : newName} onChangeText={renaming ? setRename : setNewName} maxLength={80} style={styles.input} />
            <View style={styles.bulk}>
              <Button label="Cancel" variant="outline" onPress={() => { setCreating(false); setRenaming(null); }} />
              <Button
                label={renaming ? "Save" : "Create"}
                disabled={(renaming ? rename : newName).trim().length === 0}
                onPress={() => {
                  if (renaming) {
                    void renameGroup(userId, renaming.id, rename).then(async (result) => {
                      if ("error" in result) toast(result.error);
                      else setGroups(await loadCollections(userId));
                      setRenaming(null);
                    });
                    return;
                  }
                  void createGroup(userId, newName).then(async (created) => {
                    if ("error" in created) toast(created.error);
                    else {
                      setNewName("");
                      setGroups(await loadCollections(userId));
                    }
                    setCreating(false);
                  });
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={deleting !== null} transparent animationType="fade" onRequestClose={() => setDeleting(null)}>
        <Pressable style={styles.scrim} onPress={() => setDeleting(null)}>
          <Pressable style={styles.card} onPress={() => undefined}>
            <Text style={styles.heading}>{deleting ? `Delete ${deleting.name}?` : "Delete collection?"}</Text>
            <Text style={styles.note}>{deleting ? `Its ${deleting.bookIds.length} books stay in your Library.` : ""}</Text>
            <View style={styles.bulk}>
              <Button label="Cancel" variant="outline" onPress={() => setDeleting(null)} />
              <Button label="Delete" onPress={() => { if (!deleting) return; void deleteGroup(userId, deleting.id).then(() => loadCollections(userId).then(setGroups)); setDeleting(null); }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setSortOpen(false)}>
          <Pressable style={styles.card} onPress={() => undefined}>
            {sorts.map((item) => {
              const Icon = item.Icon;
              return (
                <Pressable key={item.id} accessibilityRole="button" onPress={() => { setSort(item.id); setSortOpen(false); }} style={styles.sortRow}>
                  <Icon color={colors.ink} size={16} strokeWidth={1.5} />
                  <Text style={styles.toolLabel}>{item.label}</Text>
                  {sort === item.id ? <Check color={colors.ink} size={16} strokeWidth={2} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
      <Toast item={notice} onDone={() => setNotice(null)} />
    </View>
  );

  async function downloadOne(book: Book) {
    setMenuBook(null);
    const { status, body } = await requestDownload(book.id, false);
    if (status === 409) {
      toast("Open the book to save it on this device again.");
      return;
    }
    if (status !== 200 || !body.url) {
      toast(body.error?.message ?? "The download didn't start.");
      return;
    }
    try {
      const file = await downloadBookFile(body.url, userId, book.id, () => undefined);
      rememberBook({
        userId,
        bookId: book.id,
        path: file.uri,
        size: file.size ?? 0,
        savedAt: new Date().toISOString(),
        title: book.title,
        author: book.author,
        category: book.category,
      });
      setLocal(localBooks(userId));
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Saving the file failed. Try again.");
    }
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  page: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 160, gap: 16 },
  tools: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  tool: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8 },
  toolLabel: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  sortRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: radius.panel, paddingHorizontal: 12, color: colors.ink, fontFamily: font.sans },
  tabs: { gap: 16 },
  tab: { minHeight: 44, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabOn: { borderBottomColor: colors.ink },
  tabLabel: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  tabLabelOn: { fontFamily: font.medium, color: colors.ink },
  note: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  heading: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: colors.ink },
  book: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: colors.ink },
  block: { gap: 8 },
  rowGap: { gap: 12 },
  continue: { width: 140, gap: 8 },
  track: { height: 2, borderRadius: 1, backgroundColor: colors.line, overflow: "hidden" },
  fill: { height: 2, backgroundColor: colors.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  gridCell: { width: "47%" },
  list: { gap: 8 },
  listItem: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  listCover: { width: 48 },
  deviceLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  covers: { flexDirection: "row", gap: 6, marginTop: 6 },
  mini: { width: 28 },
  dim: { opacity: 0.5 },
  groupRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupMain: { flex: 1, gap: 2 },
  menuBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, gap: 8, padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
  bulk: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: "center", padding: 16 },
  card: { backgroundColor: colors.surface, borderRadius: radius.panel, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 },
});
