"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

type Variant = "success" | "error" | "warning" | "info";
type Toast = { id: number; message: string; variant: Variant };
type ToastContextValue = Record<Variant, (message: string) => void>;

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}

const STYLES: Record<Variant, { icon: typeof Info; color: string; bar: string }> = {
  success: { icon: CheckCircle2, color: "text-emerald-300", bar: "bg-emerald-400" },
  error: { icon: XCircle, color: "text-red-300", bar: "bg-red-400" },
  warning: { icon: AlertTriangle, color: "text-amber-300", bar: "bg-amber-400" },
  info: { icon: Info, color: "text-accent-bright", bar: "bg-accent-bright" },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: Variant) => {
      const id = nextId++;
      setToasts((current) => [...current.slice(-3), { id, message, variant }]);
      // Errors stay a little longer; they usually need reading.
      setTimeout(() => dismiss(id), variant === "error" ? 6000 : 3800);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push(message, "success"),
      error: (message) => push(message, "error"),
      warning: (message) => push(message, "warning"),
      info: (message) => push(message, "info"),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[120] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-full sm:max-w-sm"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { icon: Icon, color, bar } = STYLES[toast.variant];
            return (
              <motion.div
                key={toast.id}
                layout
                role={toast.variant === "error" ? "alert" : "status"}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="edge pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl py-3.5 pl-4 pr-2 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.9)]"
              >
                <span aria-hidden className={`absolute inset-y-0 left-0 w-0.5 ${bar}`} />
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden />
                <p className="flex-1 text-sm leading-relaxed text-fg">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="-my-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-faint transition hover:bg-white/5 hover:text-fg"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
