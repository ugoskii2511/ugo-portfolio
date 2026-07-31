"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { Reveal } from "@/components/reveal";
import { useSpotlight } from "@/lib/use-spotlight";
import { useToast } from "@/components/admin/toast-provider";
import { useConfirm } from "@/components/admin/confirm-dialog";
import {
  AnnouncementFormModal,
  type AnnouncementFormValues,
} from "@/components/admin/announcement-form-modal";

export type AdminAnnouncement = {
  id: string;
  message: string;
  isActive: boolean;
  createdAt: string;
};

export function AnnouncementsManager({ announcements }: { announcements: AdminAnnouncement[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingValues, setEditingValues] = useState<AnnouncementFormValues | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreateForm() {
    setEditingValues(null);
    setIsFormOpen(true);
  }

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      // Syncing UI state from the URL's query param is a legitimate
      // external-system read, not derivable during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openCreateForm();
      router.replace("/admin/announcements");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openEditForm(announcement: AdminAnnouncement) {
    setEditingValues({
      id: announcement.id,
      message: announcement.message,
      isActive: announcement.isActive,
    });
    setIsFormOpen(true);
  }

  async function handleDelete(announcement: AdminAnnouncement) {
    const ok = await confirm({
      title: "Delete this announcement?",
      description: "It will be removed from the site banner immediately.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    setDeletingId(announcement.id);
    try {
      const response = await fetch(`/api/announcements/${announcement.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed");
      toast.success("Announcement deleted.");
      router.refresh();
    } catch {
      toast.error("Couldn't delete that announcement.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Manage the sitewide announcement banner.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Announcement
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-foreground/60">
          No announcements yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((announcement, index) => (
            <AnnouncementRow
              key={announcement.id}
              announcement={announcement}
              index={index}
              isDeleting={deletingId === announcement.id}
              onEdit={() => openEditForm(announcement)}
              onDelete={() => handleDelete(announcement)}
            />
          ))}
        </div>
      )}

      <AnnouncementFormModal
        isOpen={isFormOpen}
        initialValues={editingValues}
        onClose={() => setIsFormOpen(false)}
        onSaved={(wasEditing) => {
          toast.success(wasEditing ? "Announcement updated." : "Announcement created.");
          router.refresh();
        }}
      />
    </div>
  );
}

function AnnouncementRow({
  announcement,
  index,
  isDeleting,
  onEdit,
  onDelete,
}: {
  announcement: AdminAnnouncement;
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
          <span
            className={clsx(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              announcement.isActive
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-foreground/10 text-foreground/60"
            )}
          >
            {announcement.isActive ? "Active" : "Inactive"}
          </span>
          <span className="text-xs text-foreground/50">
            {new Date(announcement.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
          </span>
        </div>
        <p className="mt-2 text-sm text-foreground/80">{announcement.message}</p>
      </div>

      <div className="relative z-10 flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle transition hover:border-primary/40 hover:text-primary"
          aria-label="Edit announcement"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
          aria-label="Delete announcement"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Reveal>
  );
}
