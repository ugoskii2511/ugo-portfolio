"use client";

import { useId, useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { AdminModal, ModalFormFooter } from "@/components/admin/modal";
import { Field } from "@/components/admin/ui";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";
import { SERVICE_ICONS } from "@/lib/service-icons";
import { SERVICE_ICON_KEYS, type ServiceIcon } from "@/lib/services-data";

export type ServiceCategoryFormValues = {
  id?: string;
  title: string;
  description: string;
  icon: ServiceIcon;
  order: number;
};

const EMPTY_VALUES: ServiceCategoryFormValues = { title: "", description: "", icon: "code", order: 0 };

export function ServiceCategoryFormModal({
  isOpen,
  initialValues,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  initialValues: ServiceCategoryFormValues | null;
  onClose: () => void;
  onSaved: (wasEditing: boolean) => void;
}) {
  const [values, setValues] = useState<ServiceCategoryFormValues>(initialValues ?? EMPTY_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const formId = useId();
  const ids = { title: useId(), description: useId(), order: useId(), icon: useId() };
  const isEditing = Boolean(initialValues?.id);

  function resetAndClose() {
    setValues(EMPTY_VALUES);
    setError("");
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await adminRequest(isEditing ? `/api/service-categories/${initialValues!.id}` : "/api/service-categories", {
        method: isEditing ? "PATCH" : "POST",
        body: { title: values.title, description: values.description, icon: values.icon, order: values.order },
      });
      onSaved(isEditing);
      resetAndClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={isEditing ? "Edit category" : "New category"}
      footer={
        <ModalFormFooter
          formId={formId}
          onCancel={resetAndClose}
          submitLabel={isEditing ? "Save changes" : "Create category"}
          isSubmitting={isSubmitting}
          error={error}
        />
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Title" htmlFor={ids.title} count={[values.title.length, 100]}>
          <input
            id={ids.title}
            required
            maxLength={100}
            placeholder="e.g. Frontend Development"
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className="field"
          />
        </Field>
        <Field label="Description" htmlFor={ids.description} count={[values.description.length, 300]}>
          <textarea
            id={ids.description}
            required
            rows={2}
            maxLength={300}
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            className="field resize-none"
          />
        </Field>
        <fieldset>
          <legend className="text-[0.8rem] font-medium text-fg/90">Icon</legend>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {SERVICE_ICON_KEYS.map((key) => {
              const { icon: Icon, label } = SERVICE_ICONS[key];
              const selected = values.icon === key;
              return (
                <label
                  key={key}
                  className={clsx(
                    "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[0.7rem] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-bright",
                    selected ? "border-accent bg-accent-soft text-fg" : "border-line text-muted hover:border-line-strong hover:text-fg"
                  )}
                >
                  <input
                    type="radio"
                    name={ids.icon}
                    value={key}
                    checked={selected}
                    onChange={() => setValues((v) => ({ ...v, icon: key }))}
                    className="sr-only"
                  />
                  <Icon className={clsx("h-4 w-4", selected && "text-accent-bright")} aria-hidden />
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Field label="Display order" htmlFor={ids.order} hint="Lower numbers appear first." className="sm:max-w-[12rem]">
          <input
            id={ids.order}
            type="number"
            step={1}
            value={values.order}
            onChange={(e) => setValues((v) => ({ ...v, order: Number(e.target.value) }))}
            className="field"
          />
        </Field>
      </form>
    </AdminModal>
  );
}
