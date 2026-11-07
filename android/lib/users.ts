export type StoredUser = {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  downloadsUsed: number;
};

/**
 * In-memory account stub. The repo has no database.
 * Seed login matches the web app: dane@elibrary.local / library1.
 * New accounts last until the process restarts.
 */
export const users: StoredUser[] = [
  {
    name: "Dane Peralta",
    email: "dane@elibrary.local",
    password: "library1",
    role: "user",
    downloadsUsed: 0,
  },
];

export function findUser(email: string, password: string): StoredUser | undefined {
  const needle = email.trim().toLowerCase();
  return users.find((user) => user.email.toLowerCase() === needle && user.password === password);
}

export function emailTaken(email: string): boolean {
  const needle = email.trim().toLowerCase();
  return users.some((user) => user.email.toLowerCase() === needle);
}
