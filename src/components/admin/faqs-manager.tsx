"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { useSpotlight } from "@/lib/use-spotlight";
import { useToast } from "@/components/admin/toast-provider";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { FaqFormModal, type FaqFormValues } from "@/components/admin/faq-form-modal";

export type AdminFaq = { id: string; question: string; answer: string; order: number };

export function FaqsManager({ faqs }: { faqs: AdminFaq[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingValues, setEditingValues] = useState<FaqFormValues | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreateForm() {
    setEditingValues(null);
    setIsFormOpen(true);
  }

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openCreateForm();
      router.replace("/admin/faqs");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openEditForm(faq: AdminFaq) {
    setEditingValues({ id: faq.id, question: faq.question, answer: faq.answer, order: faq.order });
    setIsFormOpen(true);
  }

  async function handleDelete(faq: AdminFaq) {
    const ok = await confirm({
      title: "Delete this FAQ?",
      description: "It will be removed from the About page immediately.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    setDeletingId(faq.id);
    try {
      const response = await fetch(`/api/faqs/${faq.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed");
      toast.success("FAQ deleted.");
      router.refresh();
    } catch {
      toast.error("Couldn't delete that FAQ.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">FAQ</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Manage the frequently-asked-questions list on the About page.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New FAQ
        </button>
      </div>

      {faqs.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-foreground/60">
          No FAQ items yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {faqs.map((faq, index) => (
            <FaqRow
              key={faq.id}
              faq={faq}
              index={index}
              isDeleting={deletingId === faq.id}
              onEdit={() => openEditForm(faq)}
              onDelete={() => handleDelete(faq)}
            />
          ))}
        </div>
      )}

      <FaqFormModal
        isOpen={isFormOpen}
        initialValues={editingValues}
        onClose={() => setIsFormOpen(false)}
        onSaved={(wasEditing) => {
          toast.success(wasEditing ? "FAQ updated." : "FAQ created.");
          router.refresh();
        }}
      />
    </div>
  );
}

function FaqRow({
  faq,
  index,
  isDeleting,
  onEdit,
  onDelete,
}: {
  faq: AdminFaq;
  index: number;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { onMouseMove, onMouseLeave, spotlightStyle } = useSpotlight();

  return (
    <Reveal
      delay={Math.min(index, 6) * 40}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="glass-panel relative flex items-start justify-between gap-4 overflow-hidden rounded-2xl p-5"
    >
      <div className="pointer-events-none absolute inset-0" style={spotlightStyle} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
            #{faq.order}
          </span>
          <p className="font-medium">{faq.question}</p>
        </div>
        <p className="mt-2 text-sm text-foreground/70">{faq.answer}</p>
      </div>

      <div className="relative z-10 flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle transition hover:border-primary/40 hover:text-primary"
          aria-label="Edit FAQ"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
          aria-label="Delete FAQ"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Reveal>
  );
}
