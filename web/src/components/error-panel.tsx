import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

/** Full-page error. One title, one sentence, one action. */
export function ErrorPanel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col items-start px-4 py-16 md:px-8">
      <h1 className="serif text-[32px] leading-10 font-light">{title}</h1>
      <p className="mt-2 max-w-[560px] text-base leading-6 text-muted-foreground">{children}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function RetryButton({ label = "Try again" }: { label?: string }) {
  return (
    <form action="">
      <Button type="submit">{label}</Button>
    </form>
  );
}
