import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { Session } from "@/lib/types";
import { emailTaken, findUser, users } from "@/lib/users";

const librarySeed: Record<string, string[]> = {
  "dane@elibrary.local": ["pride-and-prejudice", "frankenstein", "meditations"],
};

const favoriteSeed: Record<string, string[]> = {
  "dane@elibrary.local": ["dracula", "walden"],
};

type SessionContextValue = {
  session: Session;
  libraryIds: string[];
  favoriteIds: string[];
  login: (email: string, password: string) => string | null;
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

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      libraryIds,
      favoriteIds,
      login(email, password) {
        const user = findUser(email, password);
        if (!user) return "Incorrect email or password.";
        setSession(userSession(user));
        setLibraryIds(librarySeed[user.email] ?? []);
        setFavoriteIds(favoriteSeed[user.email] ?? []);
        return null;
      },
      register(name, email, password) {
        const displayName = name.trim();
        if (!displayName) return "Enter a display name.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          return "Enter a valid email, like name@example.com.";
        }
        if (password.length < 8) return "Use at least 8 characters.";
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
        return null;
      },
      continueAsGuest() {
        setSession({ kind: "guest" });
        setLibraryIds([]);
        setFavoriteIds([]);
      },
      logout() {
        setSession({ kind: "none" });
        setLibraryIds([]);
        setFavoriteIds([]);
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
        if (password.length < 8) return "Use at least 8 characters.";
        if (password !== confirm) return "Those passwords don't match.";
        if (session.kind === "user") {
          const stored = users.find((item) => item.email === session.email);
          if (stored) stored.password = password;
        }
        return null;
      },
    }),
    [session, libraryIds, favoriteIds],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
