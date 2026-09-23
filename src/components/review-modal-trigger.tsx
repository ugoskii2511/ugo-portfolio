"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PenLine, X } from "lucide-react";
import { ReviewForm } from "@/components/review-form";

export function ReviewModalTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-fg transition hover:border-white/25 hover:bg-white/[0.06]"
      >
        <PenLine className="h-4 w-4" />
        Write a Review
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-modal-title"
              className="edge relative z-10 max-h-[calc(100svh-2rem)] w-full max-w-lg overflow-y-auto rounded-[1.4rem] p-6 text-fg sm:p-8"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-fg"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 id="review-modal-title" className="mb-6 text-2xl font-semibold tracking-tight">Share your experience</h3>
              <ReviewForm />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
