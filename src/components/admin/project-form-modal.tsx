"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImageUp, Loader2, X } from "lucide-react";
import { useToast } from "@/components/admin/toast-provider";

export type ProjectFormValues = {
  id?: string;
  name: string;
  summary: string;
  liveUrl: string;
  imageUrl: string;
  techStack: string;
  featured: boolean;
  order: number;
};

const EMPTY_VALUES: ProjectFormValues = {
  name: "",
  summary: "",
  liveUrl: "",
  imageUrl: "",
  techStack: "",
  featured: false,
  order: 0,
};

export function ProjectFormModal({
  isOpen,
  initialValues,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  initialValues: ProjectFormValues | null;
  onClose: () => void;
  onSaved: (wasEditing: boolean) => void;
}) {
  const [values, setValues] = useState<ProjectFormValues>(initialValues ?? EMPTY_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const isEditing = Boolean(initialValues?.id);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Upload failed. Please try again.");
      }

      setValues((v) => ({ ...v, imageUrl: data.url }));
      toast.success("Image uploaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }

  function resetAndClose() {
    setValues(EMPTY_VALUES);
    setErrorMessage("");
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const payload = {
      name: values.name,
      summary: values.summary,
      liveUrl: values.liveUrl,
      imageUrl: values.imageUrl,
      techStack: values.techStack
        .split(",")
        .map((tech) => tech.trim())
        .filter(Boolean),
      featured: values.featured,
      order: values.order,
    };

    try {
      const response = await fetch(
        isEditing ? `/api/projects/${initialValues!.id}` : "/api/projects",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
            className="glass-panel relative z-10 w-full max-w-lg overflow-y-auto rounded-2xl p-6 sm:p-8"
            style={{ maxHeight: "90vh" }}
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
              {isEditing ? "Edit Project" : "Add Project"}
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Project Name</span>
                <input
                  required
                  value={values.name}
                  onChange={(event) => setValues((v) => ({ ...v, name: event.target.value }))}
                  className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Summary / Bio</span>
                <textarea
                  required
                  rows={3}
                  value={values.summary}
                  onChange={(event) => setValues((v) => ({ ...v, summary: event.target.value }))}
                  className="resize-none rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Live Demo URL</span>
                <input
                  type="url"
                  placeholder="https://..."
                  value={values.liveUrl}
                  onChange={(event) => setValues((v) => ({ ...v, liveUrl: event.target.value }))}
                  className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                />
              </label>

              <div className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Cover Image (optional)</span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle px-3.5 py-2.5 text-sm font-medium text-foreground/70 transition hover:border-primary/40 hover:text-primary disabled:opacity-60"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageUp className="h-4 w-4" />
                  )}
                  {isUploading ? "Uploading..." : "Upload from device"}
                </button>

                {values.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={values.imageUrl}
                    alt=""
                    className="mt-1 h-28 w-full rounded-lg object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-foreground/50">Or paste an image URL directly</span>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={values.imageUrl}
                    onChange={(event) =>
                      setValues((v) => ({ ...v, imageUrl: event.target.value }))
                    }
                    className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                  />
                </label>
                <span className="text-xs text-foreground/50">
                  Leave blank to use a generated placeholder with your tech stack.
                </span>
              </div>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Tech Stack (comma-separated)</span>
                <input
                  placeholder="Next.js, Tailwind CSS, Postgres"
                  value={values.techStack}
                  onChange={(event) => setValues((v) => ({ ...v, techStack: event.target.value }))}
                  className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                />
              </label>

              <div className="flex items-center gap-4">
                <label className="flex flex-1 flex-col gap-1.5 text-sm">
                  <span className="font-medium">Display Order</span>
                  <input
                    type="number"
                    value={values.order}
                    onChange={(event) =>
                      setValues((v) => ({ ...v, order: Number(event.target.value) }))
                    }
                    className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                  />
                </label>
                <label className="flex items-center gap-2 pt-6 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={values.featured}
                    onChange={(event) =>
                      setValues((v) => ({ ...v, featured: event.target.checked }))
                    }
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  Featured
                </label>
              </div>

              {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-medium text-white shadow-lg shadow-primary/30 transition hover:opacity-90 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Add Project"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
