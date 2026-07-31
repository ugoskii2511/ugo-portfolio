"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PenLine, X } from "lucide-react";
import { ReviewForm } from "@/components/review-form";

export function ReviewModalTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 transition hover:opacity-90"
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
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Write a review"
              className="glass-panel relative z-10 w-full max-w-lg rounded-2xl p-6 sm:p-8"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="absolute right-4 top-4 rounded-full p-1.5 text-foreground/60 transition hover:bg-primary-soft hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="mb-4 text-xl font-semibold">Share your experience</h3>
              <ReviewForm />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
