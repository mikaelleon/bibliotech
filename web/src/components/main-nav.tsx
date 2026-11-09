import {
  BookOpen,
  ChartColumn,
  Download,
  Heart,
  LayoutDashboard,
  Library,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Session } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  locked: boolean;
  current: (path: string) => boolean;
};

/** Reader navigation, or the operator shell. Administrators do not see reader destinations. */
export function mainNav(session: Session, compact: boolean): NavItem[] {
  if (session.kind === "user" && session.role === "admin") {
    return [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        locked: false,
        current: (path) => path === "/admin",
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: ChartColumn,
        locked: false,
        current: (path) => path.startsWith("/admin/analytics"),
      },
      {
        href: "/admin/books",
        label: "Books",
        icon: Library,
        locked: false,
        current: (path) => path.startsWith("/admin/books"),
      },
      {
        href: "/admin/users",
        label: "Users",
        icon: Users,
        locked: false,
        current: (path) => path.startsWith("/admin/users"),
      },
    ];
  }

  const guest = session.kind !== "user";
  return [
    {
      href: "/browse",
      label: "Browse",
      icon: BookOpen,
      locked: false,
      current: (path) => path === "/browse" || path.startsWith("/books/") || path.startsWith("/search"),
    },
    {
      href: "/library",
      label: compact ? "Library" : "My Library",
      icon: Library,
      locked: guest,
      current: (path) => path === "/library",
    },
    {
      href: "/favorites",
      label: "Favorites",
      icon: Heart,
      locked: guest,
      current: (path) => path === "/favorites",
    },
    {
      href: "/downloads",
      label: compact ? "Downloads" : "Download history",
      icon: Download,
      locked: guest,
      current: (path) => path === "/downloads" || path.startsWith("/downloads/"),
    },
    {
      href: "/profile",
      label: "Profile",
      icon: User,
      locked: guest,
      current: (path) => path === "/profile",
    },
  ];
}
