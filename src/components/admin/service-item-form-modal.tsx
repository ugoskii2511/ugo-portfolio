"use client";

import { useId, useState, type FormEvent } from "react";
import { AdminModal, ModalFormFooter } from "@/components/admin/modal";
import { Field } from "@/components/admin/ui";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";

export type ServiceItemFormValues = {
  id?: string;
  categoryId: string;
  title: string;
  description: string;
  order: number;
};

function emptyValues(categoryId: string): ServiceItemFormValues {
  return { categoryId, title: "", description: "", order: 0 };
}

export function ServiceItemFormModal({
  isOpen,
  categoryId,
  categoryTitle,
  initialValues,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  categoryId: string;
  categoryTitle?: string;
  initialValues: ServiceItemFormValues | null;
  onClose: () => void;
  onSaved: (wasEditing: boolean) => void;
}) {
  const [values, setValues] = useState<ServiceItemFormValues>(initialValues ?? emptyValues(categoryId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const formId = useId();
  const ids = { title: useId(), description: useId(), order: useId() };
  const isEditing = Boolean(initialValues?.id);

  function resetAndClose() {
    setValues(emptyValues(categoryId));
    setError("");
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await adminRequest(isEditing ? `/api/service-items/${initialValues!.id}` : "/api/service-items", {
        method: isEditing ? "PATCH" : "POST",
        body: { categoryId: values.categoryId, title: values.title, description: values.description, order: values.order },
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
      title={isEditing ? "Edit service" : "New service"}
      description={categoryTitle ? `In ${categoryTitle}. Also appears as an option in the booking form.` : undefined}
      footer={
        <ModalFormFooter
          formId={formId}
          onCancel={resetAndClose}
          submitLabel={isEditing ? "Save changes" : "Create service"}
          isSubmitting={isSubmitting}
          error={error}
        />
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Title" htmlFor={ids.title} count={[values.title.length, 150]}>
          <input
            id={ids.title}
            required
            maxLength={150}
            placeholder="e.g. Next.js Website Development"
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className="field"
          />
        </Field>
        <Field label="Description" htmlFor={ids.description} count={[values.description.length, 300]}>
          <textarea
            id={ids.description}
            required
            rows={3}
            maxLength={300}
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            className="field resize-none"
          />
        </Field>
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
