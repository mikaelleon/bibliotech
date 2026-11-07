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
  toggleFavorite: (bookId: string) => boolean;
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

  useEffect(() => {
    let live = true;
    void load().then((saved) => {
      if (!live) return;
      if (saved?.kind === "guest") setSession({ kind: "guest" });
      if (saved?.kind === "user" && saved.email) {
        const user = userByEmail(saved.email);
        if (user) {
          setSession(userSession(user));
          setLibraryIds(librarySeed[user.email] ?? []);
          setFavoriteIds(favoriteSeed[user.email] ?? []);
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
        setLibraryIds(librarySeed[user.email] ?? []);
        setFavoriteIds(favoriteSeed[user.email] ?? []);
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
        setLibraryIds([]);
        setFavoriteIds([]);
        void save(null);
      },
      toggleFavorite(bookId: string) {
        let added = false;
        setFavoriteIds((current) => {
          if (current.includes(bookId)) return current.filter((id) => id !== bookId);
          added = true;
          return [bookId, ...current];
        });
        return added;
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
