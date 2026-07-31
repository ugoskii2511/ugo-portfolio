"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";

export type AnnouncementFormValues = {
  id?: string;
  message: string;
  isActive: boolean;
};

const EMPTY_VALUES: AnnouncementFormValues = { message: "", isActive: true };

export function AnnouncementFormModal({
  isOpen,
  initialValues,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  initialValues: AnnouncementFormValues | null;
  onClose: () => void;
  onSaved: (wasEditing: boolean) => void;
}) {
  const [values, setValues] = useState<AnnouncementFormValues>(initialValues ?? EMPTY_VALUES);
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
      const response = await fetch(
        isEditing ? `/api/announcements/${initialValues!.id}` : "/api/announcements",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: values.message, isActive: values.isActive }),
        }
      );

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
            className="glass-panel relative z-10 w-full max-w-md rounded-2xl p-6 sm:p-8"
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

            <h3 className="mb-4 text-xl font-semibold">
              {isEditing ? "Edit Announcement" : "New Announcement"}
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Message</span>
                <textarea
                  required
                  rows={3}
                  maxLength={300}
                  placeholder="e.g. Currently available for new freelance projects!"
                  value={values.message}
                  onChange={(event) => setValues((v) => ({ ...v, message: event.target.value }))}
                  className="resize-none rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={values.isActive}
                  onChange={(event) => setValues((v) => ({ ...v, isActive: event.target.checked }))}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                Active (visible on site)
              </label>

              {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-medium text-white shadow-lg shadow-primary/30 transition hover:opacity-90 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Announcement"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
