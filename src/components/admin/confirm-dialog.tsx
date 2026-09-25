"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { buttonClass } from "@/components/site/button";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
};

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  return context;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const respond = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }, []);

  // Escape cancels; focus starts on Cancel (the safe choice) and returns
  // to whatever opened the dialog.
  useEffect(() => {
    if (!options) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => cancelRef.current?.focus());
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") respond(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [options, respond]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {options && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div aria-hidden className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => respond(false)} />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={options.description ? descriptionId : undefined}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="edge relative z-10 w-full max-w-sm rounded-[1.25rem] p-6"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                    options.danger
                      ? "border-red-400/30 bg-red-500/10 text-red-300"
                      : "border-accent/40 bg-accent-soft text-accent-bright"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 id={titleId} className="font-semibold tracking-tight">
                    {options.title}
                  </h2>
                  {options.description && (
                    <p id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-muted">
                      {options.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button ref={cancelRef} type="button" onClick={() => respond(false)} className={buttonClass("secondary", "sm")}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => respond(true)}
                  className={buttonClass(options.danger ? "danger" : "primary", "sm")}
                >
                  {options.confirmLabel ?? "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
