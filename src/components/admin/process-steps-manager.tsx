"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { useSpotlight } from "@/lib/use-spotlight";
import { useToast } from "@/components/admin/toast-provider";
import { useConfirm } from "@/components/admin/confirm-dialog";
import {
  ProcessStepFormModal,
  type ProcessStepFormValues,
} from "@/components/admin/process-step-form-modal";

export type AdminProcessStep = { id: string; title: string; description: string; order: number };

export function ProcessStepsManager({ steps }: { steps: AdminProcessStep[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingValues, setEditingValues] = useState<ProcessStepFormValues | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreateForm() {
    setEditingValues(null);
    setIsFormOpen(true);
  }

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openCreateForm();
      router.replace("/admin/process");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openEditForm(step: AdminProcessStep) {
    setEditingValues({ id: step.id, title: step.title, description: step.description, order: step.order });
    setIsFormOpen(true);
  }

  async function handleDelete(step: AdminProcessStep) {
    const ok = await confirm({
      title: "Delete this step?",
      description: "It will be removed from the \"How I Work\" section immediately.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    setDeletingId(step.id);
    try {
      const response = await fetch(`/api/process-steps/${step.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed");
      toast.success("Step deleted.");
      router.refresh();
    } catch {
      toast.error("Couldn't delete that step.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Process Steps</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Manage the &quot;How I Work&quot; steps shown on Home and About.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Step
        </button>
      </div>

      {steps.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-foreground/60">
          No process steps yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <StepRow
              key={step.id}
              step={step}
              displayIndex={index}
              isDeleting={deletingId === step.id}
              onEdit={() => openEditForm(step)}
              onDelete={() => handleDelete(step)}
            />
          ))}
        </div>
      )}

      <ProcessStepFormModal
        key={editingValues?.id ?? "new"}
        isOpen={isFormOpen}
        initialValues={editingValues}
        onClose={() => setIsFormOpen(false)}
        onSaved={(wasEditing) => {
          toast.success(wasEditing ? "Step updated." : "Step created.");
          router.refresh();
        }}
      />
    </div>
  );
}

function StepRow({
  step,
  displayIndex,
  isDeleting,
  onEdit,
  onDelete,
}: {
  step: AdminProcessStep;
  displayIndex: number;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { onMouseMove, onMouseLeave, spotlightStyle } = useSpotlight();

  return (
    <Reveal
      delay={Math.min(displayIndex, 6) * 40}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="glass-panel relative flex items-start justify-between gap-4 overflow-hidden rounded-2xl p-5"
    >
      <div className="pointer-events-none absolute inset-0" style={spotlightStyle} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-bold text-primary/60">
            {String(displayIndex + 1).padStart(2, "0")}
          </span>
          <p className="font-medium">{step.title}</p>
        </div>
        <p className="mt-2 text-sm text-foreground/70">{step.description}</p>
      </div>

      <div className="relative z-10 flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle transition hover:border-primary/40 hover:text-primary"
          aria-label="Edit step"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
          aria-label="Delete step"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Reveal>
  );
}
