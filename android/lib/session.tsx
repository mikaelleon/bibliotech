import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { Session } from "@/lib/types";
import { emailTaken, findUser, users } from "@/lib/users";

type SessionContextValue = {
  session: Session;
  login: (email: string, password: string) => string | null;
  register: (name: string, email: string, password: string) => string | null;
  continueAsGuest: () => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ kind: "none" });

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      login(email, password) {
        const user = findUser(email, password);
        if (!user) return "Incorrect email or password.";
        setSession({
          kind: "user",
          name: user.name,
          email: user.email,
          role: user.role,
          downloadsUsed: user.downloadsUsed,
        });
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
        setSession({
          kind: "user",
          name: stored.name,
          email: stored.email,
          role: stored.role,
          downloadsUsed: 0,
        });
        return null;
      },
      continueAsGuest() {
        setSession({ kind: "guest" });
      },
      logout() {
        setSession({ kind: "none" });
      },
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
