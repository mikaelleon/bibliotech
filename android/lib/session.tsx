import type { Session as AuthSession } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";

import { disposableMessage, isDisposableEmail } from "@/lib/disposable-domains";
import { GUEST_LIMIT, USER_LIMIT } from "@/lib/quota";
import { supabase } from "@/lib/supabase";
import type { Session } from "@/lib/types";
import { clearFailures, lockedFor, PASSWORD_MAX, passwordProblem, recordFailure } from "@/lib/users";

/**
 * Small flags kept next to the Supabase session (which lib/supabase.ts stores encrypted).
 * - visitor: "Continue as guest" without an account.
 * - short: signed in without "Keep me signed in"; the next cold start signs out.
 */
const VISITOR_KEY = "elib.visitor";
const SHORT_KEY = "elib.short";

async function readFlag(key: string): Promise<boolean> {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) === "1";
    return (await SecureStore.getItemAsync(key)) === "1";
  } catch {
    return false;
  }
}

async function writeFlag(key: string, on: boolean): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (on) globalThis.localStorage?.setItem(key, "1");
      else globalThis.localStorage?.removeItem(key);
      return;
    }
    if (on) await SecureStore.setItemAsync(key, "1");
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // A failed write only changes what happens on the next launch.
  }
}

/** Adds or removes `id` so the list matches `on`. Idempotent; `at` puts it back where it was. */
function setIn(list: string[], id: string, on: boolean, at?: number): string[] {
  const has = list.includes(id);
  if (on === has) return list;
  if (!on) return list.filter((item) => item !== id);
  if (at === undefined) return [id, ...list];
  const next = [...list];
  next.splice(Math.min(at, next.length), 0, id);
  return next;
}

function waitMessage(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

type ShelfTable = "favorites" | "library_items";
type SlugRow = { created_at: string; books: { slug: string } | { slug: string }[] | null };

function slugOf(row: SlugRow): string | null {
  const book = Array.isArray(row.books) ? row.books[0] : row.books;
  return book?.slug ?? null;
}

/** Shelf rows, newest first for Library and oldest first for Favorites (same order as the web app). */
async function loadShelf(table: ShelfTable, userId: string): Promise<SlugRow[]> {
  const { data, error } = await supabase
    .from(table)
    .select("created_at, books!inner(slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: table === "favorites" });
  if (error) throw error;
  return (data ?? []) as SlugRow[];
}

async function bookIdForSlug(slug: string): Promise<string | null> {
  const { data } = await supabase.from("books").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

/** Profile row plus the download count. RLS limits both to the signed-in user. */
async function sessionFor(auth: AuthSession): Promise<Session | null> {
  const id = auth.user.id;
  const [{ data: profile }, { data: quota }] = await Promise.all([
    supabase.from("profiles").select("display_name, role, email_verified_at").eq("id", id).maybeSingle(),
    supabase.rpc("my_quota"),
  ]);
  if (!profile) return null;
  const q = readQuota(quota, Boolean(profile.email_verified_at));
  const email = auth.user.email ?? "";
  return {
    kind: "user",
    id,
    name: profile.display_name || email.split("@")[0] || "Reader",
    email,
    role: profile.role === "admin" ? "admin" : "user",
    verified: Boolean(profile.email_verified_at),
    downloadsUsed: q.used,
    downloadLimit: q.limit,
    resetsAt: q.resetsAt,
  };
}

type QuotaRow = { used?: number; limit?: number; resetsAt?: string };

/** my_quota() result, or the tier limit with nothing used when it can't be read. */
function readQuota(value: unknown, verified: boolean): { used: number; limit: number; resetsAt: string | null } {
  const row = (value ?? {}) as QuotaRow;
  return {
    used: typeof row.used === "number" ? row.used : 0,
    limit: typeof row.limit === "number" ? row.limit : verified ? USER_LIMIT : GUEST_LIMIT,
    resetsAt: typeof row.resetsAt === "string" ? row.resetsAt : null,
  };
}

type SessionContextValue = {
  /** False until the saved session has been read on launch. */
  ready: boolean;
  session: Session;
  libraryIds: string[];
  favoriteIds: string[];
  login: (email: string, password: string, remember: boolean) => Promise<{ error: string } | { role: "user" | "admin" }>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  /** Sets the favorite to exactly `on`. `at` restores its old position (Undo). */
  setFavorite: (bookId: string, on: boolean, at?: number) => void;
  /** Adds the book to, or removes it from, Library. Never uses a download. */
  setInLibrary: (bookId: string, on: boolean, at?: number) => void;
  rename: (name: string) => Promise<string | null>;
  changePassword: (password: string, confirm: string) => Promise<string | null>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ kind: "none" });
  const [libraryIds, setLibraryIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteDates, setFavoriteDates] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  // The account whose data is on screen, so a slow load for a previous account is ignored.
  const owner = useRef<string | null>(null);

  const clearShelves = useCallback(() => {
    setLibraryIds([]);
    setFavoriteIds([]);
    setFavoriteDates({});
  }, []);

  const adopt = useCallback(
    async (auth: AuthSession | null) => {
      if (!auth) {
        owner.current = null;
        setSession((await readFlag(VISITOR_KEY)) ? { kind: "guest" } : { kind: "none" });
        clearShelves();
        return;
      }
      owner.current = auth.user.id;
      const next = await sessionFor(auth);
      if (owner.current !== auth.user.id) return;
      if (!next) {
        // Auth user without a profile row: treat as signed out rather than half signed in.
        setSession({ kind: "none" });
        clearShelves();
        return;
      }
      setSession(next);
      if (next.kind !== "user" || next.role === "admin") {
        clearShelves();
        return;
      }
      try {
        const [library, favorites] = await Promise.all([
          loadShelf("library_items", auth.user.id),
          loadShelf("favorites", auth.user.id),
        ]);
        if (owner.current !== auth.user.id) return;
        setLibraryIds(library.map(slugOf).filter((slug): slug is string => Boolean(slug)));
        const favoriteSlugs = favorites.map((row) => [slugOf(row), row.created_at] as const);
        setFavoriteIds(favoriteSlugs.map(([slug]) => slug).filter((slug): slug is string => Boolean(slug)));
        setFavoriteDates(Object.fromEntries(favoriteSlugs.filter(([slug]) => slug)));
      } catch {
        // Shelves stay empty until the next sign-in or app start; reading still works.
      }
    },
    [clearShelves],
  );

  useEffect(() => {
    let live = true;
    void (async () => {
      // A short session (no "Keep me signed in") ends on the next cold start.
      if (await readFlag(SHORT_KEY)) {
        await supabase.auth.signOut({ scope: "local" });
        await writeFlag(SHORT_KEY, false);
      }
      const { data } = await supabase.auth.getSession();
      if (!live) return;
      await adopt(data.session);
      if (live) setReady(true);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, auth) => {
      // Token refreshes keep the same account; only sign-in and sign-out change what's on screen.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        if (event === "SIGNED_IN" && auth?.user.id === owner.current) return;
        // Run outside the auth callback: supabase-js warns against awaiting its calls inside it.
        setTimeout(() => void adopt(auth), 0);
      }
    });

    // Coming back to the app (for example after opening the verification link in the browser)
    // reloads the account, so the verified state and quota are current.
    const foreground = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void supabase.auth.getSession().then(({ data }) => {
        if (live && data.session) void adopt(data.session);
      });
    });

    return () => {
      live = false;
      listener.subscription.unsubscribe();
      foreground.remove();
    };
  }, [adopt]);

  const persistShelf = useCallback(
    async (table: ShelfTable, bookId: string, on: boolean, createdAt?: string): Promise<boolean> => {
      if (session.kind !== "user") return false;
      const id = await bookIdForSlug(bookId);
      if (!id) return false;
      if (on) {
        const row = { user_id: session.id, book_id: id, ...(createdAt ? { created_at: createdAt } : {}) };
        const { error } = await supabase.from(table).upsert(row, { onConflict: "user_id,book_id", ignoreDuplicates: true });
        return !error;
      }
      const { error } = await supabase.from(table).delete().eq("user_id", session.id).eq("book_id", id);
      return !error;
    },
    [session],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      ready,
      session,
      libraryIds,
      favoriteIds,
      async login(email, password, remember) {
        if (!email.trim() || !password) return { error: "Enter your email and password." };
        const wait = lockedFor(email);
        if (wait) return { error: waitMessage(wait) };
        if (password.length > PASSWORD_MAX) return { error: "Incorrect email or password." };
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error || !data.session) {
          recordFailure(email);
          if (error?.status === 429) return { error: "Too many attempts. Try again in a few minutes." };
          if (error && !error.status) return { error: "Couldn't reach the server. Check your connection." };
          return { error: "Incorrect email or password." };
        }
        clearFailures(email);
        await writeFlag(VISITOR_KEY, false);
        await writeFlag(SHORT_KEY, !remember);
        const next = await sessionFor(data.session);
        if (!next || next.kind !== "user") return { error: "Couldn't load your account. Try again." };
        return { role: next.role };
      },
      async register(name, email, password) {
        const displayName = name.trim();
        if (!displayName) return "Enter a display name.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          return "Enter a valid email, like name@example.com.";
        }
        if (isDisposableEmail(email)) return disposableMessage;
        const problem = passwordProblem(password);
        if (problem) return problem;
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) {
          if (error.code === "user_already_exists" || error.code === "email_exists") {
            return "An account with that email already exists.";
          }
          if (error.code === "weak_password") return error.message;
          if (!error.status) return "Couldn't reach the server. Check your connection.";
          return "We couldn't create your account. Try again in a moment.";
        }
        // Confirm email is off on the project, so sign-up returns a session straight away.
        if (!data.session) return "Your account was created. Log in to continue.";
        await writeFlag(VISITOR_KEY, false);
        await writeFlag(SHORT_KEY, false);
        return null;
      },
      continueAsGuest() {
        void (async () => {
          await supabase.auth.signOut({ scope: "local" });
          await writeFlag(VISITOR_KEY, true);
          setSession({ kind: "guest" });
          clearShelves();
        })();
        setSession({ kind: "guest" });
      },
      async logout() {
        await writeFlag(VISITOR_KEY, false);
        await writeFlag(SHORT_KEY, false);
        await supabase.auth.signOut({ scope: "local" });
        owner.current = null;
        setSession({ kind: "none" });
        clearShelves();
      },
      setFavorite(bookId, on, at) {
        if (session.kind !== "user") return;
        const before = favoriteIds;
        // Undo puts the row back at its old position: favorites sort by created_at.
        let createdAt: string | undefined;
        if (on && at !== undefined && at < favoriteIds.length) {
          const after = Date.parse(favoriteDates[favoriteIds[at]] ?? "");
          const prior = at > 0 ? Date.parse(favoriteDates[favoriteIds[at - 1]] ?? "") : after - 2;
          if (Number.isFinite(after) && Number.isFinite(prior)) {
            createdAt = new Date(Math.floor((prior + after) / 2)).toISOString();
          }
        }
        setFavoriteIds((current) => setIn(current, bookId, on, at));
        const stamp = createdAt ?? new Date().toISOString();
        if (on) setFavoriteDates((current) => ({ ...current, [bookId]: stamp }));
        void persistShelf("favorites", bookId, on, createdAt).then((ok) => {
          if (!ok) setFavoriteIds(before);
        });
      },
      setInLibrary(bookId, on, at) {
        if (session.kind !== "user") return;
        const before = libraryIds;
        setLibraryIds((current) => setIn(current, bookId, on, at));
        void persistShelf("library_items", bookId, on).then((ok) => {
          if (!ok) setLibraryIds(before);
        });
      },
      async rename(name) {
        const trimmed = name.trim();
        if (!trimmed) return "Enter a display name.";
        if (session.kind !== "user") return "Log in to change your name.";
        // Column grants allow display_name only; role can't be written from the app.
        const { error } = await supabase.from("profiles").update({ display_name: trimmed }).eq("id", session.id);
        if (error) return "We couldn't save your name. Try again.";
        setSession((current) => (current.kind === "user" ? { ...current, name: trimmed } : current));
        return null;
      },
      async changePassword(password, confirm) {
        const problem = passwordProblem(password);
        if (problem) return problem;
        if (password !== confirm) return "Those passwords don't match.";
        const { error } = await supabase.auth.updateUser({ password });
        if (!error) return null;
        if (error.code === "same_password") return "Choose a password you haven't used here before.";
        if (error.code === "weak_password") return error.message;
        return "We couldn't change your password. Try again.";
      },
    }),
    [ready, session, libraryIds, favoriteIds, favoriteDates, clearShelves, persistShelf],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
