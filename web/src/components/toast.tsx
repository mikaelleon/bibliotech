"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { durPanelExit } from "@/lib/motion";

type ToastAction = { label: string; onClick: () => void };
type ToastItem = { id: number; message: string; action?: ToastAction };

type ToastContextValue = {
  toast: (message: string, action?: ToastAction) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  // Toasts on their way out. A new toast enters while the old one leaves, so the two overlap.
  const [leaving, setLeaving] = useState<ToastItem[]>([]);
  const current = useRef<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  /** Moves a toast to the leaving list, then removes it once the exit has played. */
  const retire = useCallback((old: ToastItem | null) => {
    if (!old) return;
    setLeaving((list) => [...list, old]);
    window.setTimeout(() => {
      setLeaving((list) => list.filter((entry) => entry.id !== old.id));
    }, durPanelExit);
  }, []);

  const show = useCallback(
    (next: ToastItem | null) => {
      retire(current.current);
      current.current = next;
      setItem(next);
    },
    [retire],
  );

  const dismiss = useCallback(() => show(null), [show]);

  const dismissLater = useCallback(() => {
    clear();
    timer.current = setTimeout(dismiss, 4000);
  }, [clear, dismiss]);

  const toast = useCallback(
    (message: string, action?: ToastAction) => {
      show({ id: nextId.current++, message, action });
      dismissLater();
    },
    [dismissLater, show],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {leaving.map((old) => (
        <div key={old.id} aria-hidden className={`toast-leave ${toastClass}`}>
          <p>{old.message}</p>
          {old.action ? <span className="shrink-0 text-sm leading-5 text-brand-text underline underline-offset-4">{old.action.label}</span> : null}
        </div>
      ))}
      {item ? (
        <div
          key={item.id}
          role="status"
          onMouseEnter={clear}
          onMouseLeave={dismissLater}
          className={`toast-pop ${toastClass}`}
        >
          <p>{item.message}</p>
          {item.action ? (
            <button
              type="button"
              className="shrink-0 text-sm leading-5 text-brand-text underline underline-offset-4"
              onClick={() => {
                item.action?.onClick();
                clear();
                dismiss();
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

const toastClass =
  "fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[min(420px,calc(100%-32px))] -translate-x-1/2 items-center justify-between gap-4 rounded-xl bg-card px-4 py-3 text-sm leading-5 shadow-[var(--shadow-overlay)] md:bottom-6";

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
