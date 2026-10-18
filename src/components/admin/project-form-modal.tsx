"use client";

import { useId, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { clsx } from "clsx";
import { ImageUp, Loader2, Trash2, X } from "lucide-react";
import { useToast } from "@/components/admin/toast-provider";
import { AdminModal, ModalFormFooter } from "@/components/admin/modal";
import { Field, Switch } from "@/components/admin/ui";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";

export type ProjectFormValues = {
  id?: string;
  name: string;
  summary: string;
  liveUrl: string;
  imageUrl: string;
  techStack: string[];
  featured: boolean;
  order: number;
};

const EMPTY_VALUES: ProjectFormValues = {
  name: "",
  summary: "",
  liveUrl: "",
  imageUrl: "",
  techStack: [],
  featured: false,
  order: 0,
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_TECH = 20;

function checkUrl(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return /^https?:\/\/\S+\.\S+/i.test(value.trim()) ? undefined : "Use a full link starting with https://";
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <legend className="label-mono float-left mb-1 w-full !text-[0.62rem]">{title}</legend>
      {children}
    </fieldset>
  );
}

/// Comma/Enter adds a chip, Backspace on an empty input removes the last.
/// Same `techStack: string[]` payload the API has always taken.
function TechInput({ id, value, onChange }: { id: string; value: string[]; onChange: (value: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const additions = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => !value.some((existing) => existing.toLowerCase() === t.toLowerCase()));
    if (additions.length) onChange([...value, ...additions].slice(0, MAX_TECH));
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="field flex min-h-11 flex-wrap items-center gap-1.5 !py-1.5 focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(61,107,255,0.2)]">
      {value.map((tech) => (
        <span key={tech} className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-white/[0.05] py-0.5 pl-2 pr-1 font-mono text-xs">
          {tech}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tech))}
            aria-label={`Remove ${tech}`}
            className="flex h-5 w-5 items-center justify-center rounded text-faint hover:bg-white/10 hover:text-fg"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(event) => {
          // Pasting "A, B, C" adds all three.
          if (event.target.value.includes(",")) commit(event.target.value);
          else setDraft(event.target.value);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => draft && commit(draft)}
        placeholder={value.length ? "" : "Next.js, Tailwind CSS, PostgreSQL"}
        disabled={value.length >= MAX_TECH}
        className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-faint"
      />
    </div>
  );
}

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
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const formId = useId();
  const ids = { name: useId(), summary: useId(), live: useId(), image: useId(), tech: useId(), order: useId(), featured: useId() };

  const isEditing = Boolean(initialValues?.id);
  const set = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function upload(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Use a JPG, PNG, WebP or GIF image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That image is over 4MB. Compress it and try again.");
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Upload failed. Please try again.");
      set("imageUrl", data.url);
      setFieldErrors((e) => ({ ...e, imageUrl: undefined }));
      toast.success("Image uploaded.");
    } catch (error) {
      toast.error(errorMessage(error, "Upload failed."));
    } finally {
      setIsUploading(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  function resetAndClose() {
    setValues(EMPTY_VALUES);
    setFormError("");
    setFieldErrors({});
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = { liveUrl: checkUrl(values.liveUrl), imageUrl: checkUrl(values.imageUrl) };
    setFieldErrors(errors);
    if (errors.liveUrl || errors.imageUrl) return;

    setIsSubmitting(true);
    setFormError("");
    try {
      await adminRequest(isEditing ? `/api/projects/${initialValues!.id}` : "/api/projects", {
        method: isEditing ? "PATCH" : "POST",
        body: {
          name: values.name,
          summary: values.summary,
          liveUrl: values.liveUrl.trim(),
          imageUrl: values.imageUrl.trim(),
          techStack: values.techStack,
          featured: values.featured,
          order: values.order,
        },
      });
      onSaved(isEditing);
      resetAndClose();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={resetAndClose}
      size="lg"
      title={isEditing ? "Edit project" : "Add project"}
      description={isEditing ? "Changes go live on your portfolio as soon as you save." : "It appears on /work as soon as you save."}
      footer={
        <ModalFormFooter
          formId={formId}
          onCancel={resetAndClose}
          submitLabel={isEditing ? "Save changes" : "Add project"}
          isSubmitting={isSubmitting}
          error={formError}
        />
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-6">
        <FormSection title="Basics">
          <Field label="Project name" htmlFor={ids.name} count={[values.name.length, 150]}>
            <input id={ids.name} required maxLength={150} value={values.name} onChange={(e) => set("name", e.target.value)} className="field" />
          </Field>
          <Field
            label="Summary"
            htmlFor={ids.summary}
            count={[values.summary.length, 1000]}
            hint="The first sentence becomes the one-line description on cards. Blank lines split paragraphs."
          >
            <textarea
              id={ids.summary}
              required
              rows={5}
              maxLength={1000}
              value={values.summary}
              onChange={(e) => set("summary", e.target.value)}
              className="field resize-y"
            />
          </Field>
        </FormSection>

        <FormSection title="Media & links">
          <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-xl border border-line bg-raised-2">
              {values.imageUrl && !fieldErrors.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={values.imageUrl} alt="Cover preview" className="aspect-[10/16] w-full object-cover object-top" />
              ) : (
                <div className="flex aspect-[10/16] items-center justify-center p-3 text-center text-xs text-faint">No image</div>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED.join(",")}
                className="hidden"
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) upload(file);
                }}
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={clsx(
                  "rounded-xl border border-dashed transition-colors",
                  isDragging ? "border-accent bg-accent-soft" : "border-line-strong"
                )}
              >
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-1.5 px-4 py-6 text-center text-sm text-muted transition-colors hover:text-fg disabled:opacity-60"
                >
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ImageUp className="h-5 w-5" aria-hidden />}
                  <span className="font-medium text-fg/90">{isUploading ? "Uploading…" : "Upload a screenshot"}</span>
                  <span className="text-xs text-faint">Click or drop an image · JPG, PNG, WebP, GIF · max 4MB</span>
                </button>
              </div>
              <Field label="Or image URL" htmlFor={ids.image} error={fieldErrors.imageUrl}>
                <div className="flex gap-2">
                  <input
                    id={ids.image}
                    type="url"
                    inputMode="url"
                    placeholder="https://…"
                    value={values.imageUrl}
                    onChange={(e) => set("imageUrl", e.target.value)}
                    className="field"
                    aria-invalid={Boolean(fieldErrors.imageUrl)}
                  />
                  {values.imageUrl && (
                    <button
                      type="button"
                      onClick={() => set("imageUrl", "")}
                      aria-label="Remove image"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:border-red-400/40 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </Field>
            </div>
          </div>
          <p className="text-xs text-faint">Portrait phone screenshots work best: the site shows them in a phone frame.</p>

          <Field label="Live site URL" htmlFor={ids.live} error={fieldErrors.liveUrl} hint="Shown as the “Visit live site” link.">
            <input
              id={ids.live}
              type="url"
              inputMode="url"
              placeholder="https://example.com"
              value={values.liveUrl}
              onChange={(e) => set("liveUrl", e.target.value)}
              className="field"
              aria-invalid={Boolean(fieldErrors.liveUrl)}
            />
          </Field>
        </FormSection>

        <FormSection title="Details">
          <Field label="Tech stack" htmlFor={ids.tech} hint={`Press Enter or comma to add. Up to ${MAX_TECH}.`}>
            <TechInput id={ids.tech} value={values.techStack} onChange={(v) => set("techStack", v)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display order" htmlFor={ids.order} hint="Lower numbers appear first.">
              <input
                id={ids.order}
                type="number"
                step={1}
                value={values.order}
                onChange={(e) => set("order", Number(e.target.value))}
                className="field"
              />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-medium text-fg/90" id={`${ids.featured}-label`}>
                Featured
              </span>
              <div className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3">
                <Switch
                  id={ids.featured}
                  checked={values.featured}
                  onChange={(v) => set("featured", v)}
                  label="Featured on the homepage"
                />
                <span className="text-xs text-muted">{values.featured ? "Shown first in the homepage showcase" : "Ordered after featured projects"}</span>
              </div>
            </div>
          </div>
        </FormSection>
      </form>
    </AdminModal>
  );
}
