"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastAction = { label: string; onClick: () => void };
type ToastItem = { id: number; message: string; action?: ToastAction };

type ToastContextValue = {
  toast: (message: string, action?: ToastAction) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const dismissLater = useCallback(() => {
    clear();
    timer.current = setTimeout(() => setItem(null), 4000);
  }, [clear]);

  const toast = useCallback(
    (message: string, action?: ToastAction) => {
      setItem({ id: nextId.current++, message, action });
      dismissLater();
    },
    [dismissLater],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {item ? (
        <div
          key={item.id}
          role="status"
          onMouseEnter={clear}
          onMouseLeave={dismissLater}
          className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[min(420px,calc(100%-32px))] -translate-x-1/2 items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-sm leading-5 shadow-[var(--shadow-overlay)] md:bottom-6"
        >
          <p>{item.message}</p>
          {item.action ? (
            <button
              type="button"
              className="shrink-0 text-sm leading-5 text-brand-text underline underline-offset-4"
              onClick={() => {
                item.action?.onClick();
                setItem(null);
                clear();
              }}
            >
              {item.action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
