import { passwordStrength } from "@/lib/auth-rules";
import { cn } from "@/lib/utils";

/** Four-segment meter. Always rendered so the form never shifts as typing starts. */
export function PasswordStrength({ password }: { password: string }) {
  const { level, label } = passwordStrength(password);

  return (
    <div className="mt-2 flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-150 ease-out motion-reduce:transition-none",
              segment > level ? "bg-border" : level === 1 ? "bg-brand" : "bg-foreground",
            )}
          />
        ))}
      </div>
      <span className="min-w-16 text-right text-xs leading-4 text-muted-foreground">
        {label ? <span className="sr-only">Password strength: </span> : null}
        {label}
      </span>
    </div>
  );
}
