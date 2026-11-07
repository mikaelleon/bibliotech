import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Session } from "@/lib/types";
import {
  clearFailures,
  emailTaken,
  findUser,
  lockedFor,
  passwordProblem,
  recordFailure,
  userByEmail,
  users,
} from "@/lib/users";

const librarySeed: Record<string, string[]> = {
  "dane@elibrary.local": ["pride-and-prejudice", "frankenstein", "meditations"],
};

const favoriteSeed: Record<string, string[]> = {
  "dane@elibrary.local": ["dracula", "walden"],
};

/** Stored in the device keystore. Only "keep me signed in" sessions and guests are written. */
const STORE_KEY = "elib.session";
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

type Saved = { kind: "guest" | "user"; email?: string; exp: number };

async function save(value: Saved | null) {
  try {
    if (value) await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(value));
    else await SecureStore.deleteItemAsync(STORE_KEY);
  } catch {
    // Storage is a convenience. A failed write only means signing in again next launch.
  }
}

async function load(): Promise<Saved | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Saved;
    if (typeof parsed.exp !== "number" || parsed.exp <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Favorites and Library per reader, so they survive a restart. Keys allow only [A-Za-z0-9._-]. */
type Shelves = { favorites: string[]; library: string[] };

function shelfKey(email: string): string {
  return `elib.shelves.${email.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`;
}

async function loadShelves(email: string): Promise<Shelves> {
  const seed = { favorites: favoriteSeed[email] ?? [], library: librarySeed[email] ?? [] };
  try {
    const raw = await SecureStore.getItemAsync(shelfKey(email));
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as Partial<Shelves>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : seed.favorites,
      library: Array.isArray(parsed.library) ? parsed.library : seed.library,
    };
  } catch {
    return seed;
  }
}

async function saveShelves(email: string, shelves: Shelves) {
  try {
    await SecureStore.setItemAsync(shelfKey(email), JSON.stringify(shelves));
  } catch {
    // A failed write keeps this session's shelves in memory; they reset on the next launch.
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

type SessionContextValue = {
  /** False until the saved session has been read on launch. */
  ready: boolean;
  session: Session;
  libraryIds: string[];
  favoriteIds: string[];
  login: (
    email: string,
    password: string,
    remember: boolean,
  ) => { error: string } | { role: "user" | "admin" };
  register: (name: string, email: string, password: string) => string | null;
  continueAsGuest: () => void;
  logout: () => void;
  /** Sets the favorite to exactly `on`. `at` restores its old position (Undo). */
  setFavorite: (bookId: string, on: boolean, at?: number) => void;
  /** Adds the book to, or removes it from, Library. Never uses a download. */
  setInLibrary: (bookId: string, on: boolean, at?: number) => void;
  rename: (name: string) => string | null;
  changePassword: (password: string, confirm: string) => string | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function userSession(user: { name: string; email: string; role: "user" | "admin"; downloadsUsed: number }): Session {
  return {
    kind: "user",
    name: user.name,
    email: user.email,
    role: user.role,
    downloadsUsed: user.downloadsUsed,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ kind: "none" });
  const [libraryIds, setLibraryIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  // Which reader the shelves in memory belong to, once they've been read from the device.
  const [shelfOwner, setShelfOwner] = useState<string | null>(null);

  function restoreShelves(email: string) {
    setShelfOwner(null);
    void loadShelves(email).then((shelves) => {
      setFavoriteIds(shelves.favorites);
      setLibraryIds(shelves.library);
      setShelfOwner(email);
    });
  }

  // Write the reader's shelves back whenever they change (after they've been loaded).
  useEffect(() => {
    if (session.kind !== "user" || shelfOwner !== session.email) return;
    void saveShelves(session.email, { favorites: favoriteIds, library: libraryIds });
  }, [favoriteIds, libraryIds, session, shelfOwner]);

  useEffect(() => {
    let live = true;
    void load().then((saved) => {
      if (!live) return;
      if (saved?.kind === "guest") setSession({ kind: "guest" });
      if (saved?.kind === "user" && saved.email) {
        const user = userByEmail(saved.email);
        if (user) {
          setSession(userSession(user));
          restoreShelves(user.email);
        } else {
          // The in-memory account store forgets new accounts on restart.
          void save(null);
        }
      }
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      ready,
      session,
      libraryIds,
      favoriteIds,
      login(email, password, remember) {
        if (!email.trim() || !password) return { error: "Enter your email and password." };
        const wait = lockedFor(email);
        if (wait) return { error: waitMessage(wait) };
        const user = findUser(email, password);
        if (!user) {
          recordFailure(email);
          return { error: "Incorrect email or password." };
        }
        clearFailures(email);
        setSession(userSession(user));
        restoreShelves(user.email);
        void save(remember ? { kind: "user", email: user.email, exp: Date.now() + REMEMBER_MS } : null);
        return { role: user.role };
      },
      register(name, email, password) {
        const displayName = name.trim();
        if (!displayName) return "Enter a display name.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          return "Enter a valid email, like name@example.com.";
        }
        const problem = passwordProblem(password);
        if (problem) return problem;
        if (emailTaken(email)) return "An account with that email already exists.";
        const stored = {
          name: displayName,
          email: email.trim(),
          password,
          role: "user" as const,
          downloadsUsed: 0,
        };
        users.push(stored);
        setSession(userSession(stored));
        setLibraryIds([]);
        setFavoriteIds([]);
        setShelfOwner(stored.email);
        void save({ kind: "user", email: stored.email, exp: Date.now() + REMEMBER_MS });
        return null;
      },
      continueAsGuest() {
        setSession({ kind: "guest" });
        setLibraryIds([]);
        setFavoriteIds([]);
        void save({ kind: "guest", exp: Date.now() + REMEMBER_MS });
      },
      logout() {
        setSession({ kind: "none" });
        setShelfOwner(null);
        setLibraryIds([]);
        setFavoriteIds([]);
        void save(null);
      },
      setFavorite(bookId: string, on: boolean, at?: number) {
        if (session.kind !== "user") return;
        setFavoriteIds((current) => setIn(current, bookId, on, at));
      },
      setInLibrary(bookId: string, on: boolean, at?: number) {
        if (session.kind !== "user") return;
        setLibraryIds((current) => setIn(current, bookId, on, at));
      },
      rename(name: string) {
        const trimmed = name.trim();
        if (!trimmed) return "Enter a display name.";
        setSession((current) => {
          if (current.kind !== "user") return current;
          const stored = users.find((item) => item.email === current.email);
          if (stored) stored.name = trimmed;
          return { ...current, name: trimmed };
        });
        return null;
      },
      changePassword(password: string, confirm: string) {
        const problem = passwordProblem(password);
        if (problem) return problem;
        if (password !== confirm) return "Those passwords don't match.";
        if (session.kind === "user") {
          const stored = users.find((item) => item.email === session.email);
          if (stored) stored.password = password;
        }
        return null;
      },
    }),
    [ready, session, libraryIds, favoriteIds],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
