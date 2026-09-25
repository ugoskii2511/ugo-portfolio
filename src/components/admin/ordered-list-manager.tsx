"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { useToast } from "@/components/admin/toast-provider";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { AdminModal, ModalFormFooter } from "@/components/admin/modal";
import { EmptyState, Field, IconButton, PageHeader } from "@/components/admin/ui";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";

/// Shared manager for simple ordered content (FAQ items, process steps):
/// a primary line, a longer text, and a display order. Each page supplies
/// its endpoint, field names, limits and copy; the API contract per
/// resource is unchanged.
export type OrderedItem = { id: string; primary: string; secondary: string; order: number };

export type OrderedListConfig = {
  endpoint: string; // e.g. "/api/faqs"
  path: string; // admin page path, for the ?new=1 shortcut
  keys: { primary: string; secondary: string }; // API field names
  labels: { primary: string; secondary: string };
  limits: { primary: number; secondary: number };
  placeholders?: { primary?: string; secondary?: string };
  noun: string; // "FAQ", "step"
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  deleteDescription: string;
  numbered?: boolean; // show 01, 02… from position, as the public site does
  orderHint?: string;
};

export function OrderedListManager({ items, config, icon }: { items: OrderedItem[]; config: OrderedListConfig; icon: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<OrderedItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openCreateForm() {
    setEditing(null);
    setIsFormOpen(true);
  }

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      // Syncing UI state from the URL's query param is a legitimate
      // external-system read, not derivable during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openCreateForm();
      router.replace(config.path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleDelete(item: OrderedItem) {
    const ok = await confirm({
      title: `Delete this ${config.noun}?`,
      description: config.deleteDescription,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await adminRequest(`${config.endpoint}/${item.id}`, { method: "DELETE" });
      toast.success(`${capitalize(config.noun)} deleted.`);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, `Couldn't delete that ${config.noun}.`));
    } finally {
      setBusyId(null);
    }
  }

  const addButton = (
    <button type="button" onClick={openCreateForm} className={buttonClass("primary", "sm")}>
      <Plus className="h-4 w-4" aria-hidden />
      New {config.noun}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} actions={addButton} />

      {items.length === 0 ? (
        <EmptyState
          icon={icon}
          title={config.emptyTitle}
          description={config.emptyDescription}
          action={
            <button type="button" onClick={openCreateForm} className={buttonClass("primary", "sm")}>
              Add your first {config.noun} →
            </button>
          }
        />
      ) : (
        <ol className="overflow-hidden rounded-2xl border border-line bg-raised">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border-b border-line px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.02] sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-start sm:gap-4"
            >
              <span className="pt-0.5 font-mono text-xs text-accent-bright" aria-hidden>
                {config.numbered ? String(index + 1).padStart(2, "0") : `#${item.order}`}
              </span>
              <div className="min-w-0">
                <h2 className="text-[0.95rem] font-medium tracking-tight">{item.primary}</h2>
                <p className="mt-1 text-pretty text-sm leading-relaxed text-muted">{item.secondary}</p>
                <p className="mt-2 font-mono text-[0.65rem] text-faint">order {item.order}</p>
              </div>
              <div className="col-start-2 flex gap-1.5 sm:col-start-3">
                <IconButton
                  label={`Edit ${config.noun}: ${item.primary}`}
                  onClick={() => {
                    setEditing(item);
                    setIsFormOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label={`Delete ${config.noun}: ${item.primary}`}
                  tone="danger"
                  disabled={busyId === item.id}
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </li>
          ))}
        </ol>
      )}

      <OrderedItemModal
        key={editing?.id ?? "new"}
        isOpen={isFormOpen}
        initial={editing}
        nextOrder={items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0}
        config={config}
        onClose={() => setIsFormOpen(false)}
        onSaved={(wasEditing) => {
          toast.success(`${capitalize(config.noun)} ${wasEditing ? "updated" : "created"}.`);
          router.refresh();
        }}
      />
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function OrderedItemModal({
  isOpen,
  initial,
  nextOrder,
  config,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  initial: OrderedItem | null;
  nextOrder: number;
  config: OrderedListConfig;
  onClose: () => void;
  onSaved: (wasEditing: boolean) => void;
}) {
  const empty = { primary: "", secondary: "", order: nextOrder };
  const [values, setValues] = useState(initial ? { primary: initial.primary, secondary: initial.secondary, order: initial.order } : empty);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const formId = useId();
  const ids = { primary: useId(), secondary: useId(), order: useId() };
  const isEditing = Boolean(initial);

  function resetAndClose() {
    setValues(empty);
    setError("");
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await adminRequest(isEditing ? `${config.endpoint}/${initial!.id}` : config.endpoint, {
        method: isEditing ? "PATCH" : "POST",
        body: {
          [config.keys.primary]: values.primary,
          [config.keys.secondary]: values.secondary,
          order: values.order,
        },
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
      title={isEditing ? `Edit ${config.noun}` : `New ${config.noun}`}
      footer={
        <ModalFormFooter
          formId={formId}
          onCancel={resetAndClose}
          submitLabel={isEditing ? "Save changes" : `Create ${config.noun}`}
          isSubmitting={isSubmitting}
          error={error}
        />
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label={config.labels.primary} htmlFor={ids.primary} count={[values.primary.length, config.limits.primary]}>
          <input
            id={ids.primary}
            required
            maxLength={config.limits.primary}
            placeholder={config.placeholders?.primary}
            value={values.primary}
            onChange={(e) => setValues((v) => ({ ...v, primary: e.target.value }))}
            className="field"
          />
        </Field>
        <Field label={config.labels.secondary} htmlFor={ids.secondary} count={[values.secondary.length, config.limits.secondary]}>
          <textarea
            id={ids.secondary}
            required
            rows={4}
            maxLength={config.limits.secondary}
            placeholder={config.placeholders?.secondary}
            value={values.secondary}
            onChange={(e) => setValues((v) => ({ ...v, secondary: e.target.value }))}
            className="field resize-y"
          />
        </Field>
        <Field label="Display order" htmlFor={ids.order} hint={config.orderHint ?? "Lower numbers appear first."} className="sm:max-w-[12rem]">
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
