"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";

export type FaqFormValues = {
  id?: string;
  question: string;
  answer: string;
  order: number;
};

const EMPTY_VALUES: FaqFormValues = { question: "", answer: "", order: 0 };

export function FaqFormModal({
  isOpen,
  initialValues,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  initialValues: FaqFormValues | null;
  onClose: () => void;
  onSaved: (wasEditing: boolean) => void;
}) {
  const [values, setValues] = useState<FaqFormValues>(initialValues ?? EMPTY_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = Boolean(initialValues?.id);

  function resetAndClose() {
    setValues(EMPTY_VALUES);
    setErrorMessage("");
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(isEditing ? `/api/faqs/${initialValues!.id}` : "/api/faqs", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: values.question, answer: values.answer, order: values.order }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "Something went wrong.");
      }

      onSaved(isEditing);
      resetAndClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-slate-950/60" onClick={resetAndClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="glass-panel relative z-10 w-full max-w-lg rounded-2xl p-6 sm:p-8"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
          >
            <button
              type="button"
              onClick={resetAndClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 text-foreground/60 transition hover:bg-primary-soft hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-4 text-xl font-semibold">{isEditing ? "Edit FAQ" : "New FAQ"}</h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Question</span>
                <input
                  required
                  maxLength={200}
                  value={values.question}
                  onChange={(event) => setValues((v) => ({ ...v, question: event.target.value }))}
                  className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Answer</span>
                <textarea
                  required
                  rows={4}
                  maxLength={1000}
                  value={values.answer}
                  onChange={(event) => setValues((v) => ({ ...v, answer: event.target.value }))}
                  className="resize-none rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Display Order</span>
                <input
                  type="number"
                  value={values.order}
                  onChange={(event) => setValues((v) => ({ ...v, order: Number(event.target.value) }))}
                  className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                />
                <span className="text-xs text-foreground/50">Lower numbers appear first.</span>
              </label>

              {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-medium text-white shadow-lg shadow-primary/30 transition hover:opacity-90 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create FAQ"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
