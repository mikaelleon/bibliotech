import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
  role,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  role?: "alert";
}) {
  return (
    <div role={role} className={cn("max-w-[560px] py-8", className)}>
      {icon}
      <h2 className="section-title mt-4">{title}</h2>
      <p className="mt-2 text-muted-foreground">{children}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
