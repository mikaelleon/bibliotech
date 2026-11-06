import { cn } from "@/lib/utils";

/** Line-colored block. Pulse is 1.5s and stops when the user prefers reduced motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("sk-pulse rounded-sm bg-border", className)} />;
}
