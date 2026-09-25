"use client";

import { useId, useState, type FormEvent } from "react";
import { AdminModal, ModalFormFooter } from "@/components/admin/modal";
import { Field, Switch } from "@/components/admin/ui";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";

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
  const [error, setError] = useState("");
  const formId = useId();
  const messageId = useId();
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
      await adminRequest(isEditing ? `/api/announcements/${initialValues!.id}` : "/api/announcements", {
        method: isEditing ? "PATCH" : "POST",
        body: { message: values.message, isActive: values.isActive },
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
      size="sm"
      title={isEditing ? "Edit announcement" : "New announcement"}
      footer={
        <ModalFormFooter
          formId={formId}
          onCancel={resetAndClose}
          submitLabel={isEditing ? "Save changes" : "Create"}
          isSubmitting={isSubmitting}
          error={error}
        />
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Message" htmlFor={messageId} count={[values.message.length, 300]} hint="Keep it to one short line. It sits above the navigation.">
          <textarea
            id={messageId}
            required
            rows={3}
            maxLength={300}
            placeholder="e.g. Taking on two new projects for Q4."
            value={values.message}
            onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))}
            className="field resize-none"
          />
        </Field>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted">Show it on the site now.</p>
          </div>
          <Switch checked={values.isActive} onChange={(v) => setValues((s) => ({ ...s, isActive: v }))} label="Active" />
        </div>
        {values.message.trim() && (
          <div>
            <p className="label-mono mb-2 !text-[0.6rem]">Preview</p>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-accent-soft px-4 py-2.5 text-[0.8rem]">
              <span className="live-dot shrink-0" aria-hidden />
              <span className="min-w-0 break-words">{values.message}</span>
            </div>
          </div>
        )}
      </form>
    </AdminModal>
  );
}
