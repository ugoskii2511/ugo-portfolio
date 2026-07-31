"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

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

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function respond(result: boolean) {
    resolver.current?.(result);
    setOptions(null);
  }

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
          >
            <motion.div className="absolute inset-0 bg-slate-950/60" onClick={() => respond(false)} />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.2 }}
              className="glass-panel relative z-10 w-full max-w-sm rounded-2xl p-6"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    options.danger ? "bg-red-500/10 text-red-500" : "bg-primary-soft text-primary"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{options.title}</h3>
                  {options.description && (
                    <p className="mt-1 text-sm text-foreground/70">{options.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => respond(false)}
                  className="rounded-full px-4 py-2 text-sm font-medium text-foreground/70 transition hover:bg-primary-soft"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => respond(true)}
                  className={`rounded-full px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 ${
                    options.danger ? "bg-red-500" : "bg-gradient-to-r from-primary to-primary-dark"
                  }`}
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
