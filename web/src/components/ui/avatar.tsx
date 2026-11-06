import { cn } from "@/lib/utils";

/** 44px circle with the first letter of the display name. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}
