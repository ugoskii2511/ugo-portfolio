"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { useToast } from "@/components/admin/toast-provider";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { AnnouncementFormModal, type AnnouncementFormValues } from "@/components/admin/announcement-form-modal";
import { EmptyState, IconButton, PageHeader, StatusPill, Switch, formatDate } from "@/components/admin/ui";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";

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
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function toggleActive(announcement: AdminAnnouncement, isActive: boolean) {
    setBusyId(announcement.id);
    try {
      await adminRequest(`/api/announcements/${announcement.id}`, { method: "PATCH", body: { isActive } });
      toast.success(isActive ? "Announcement activated." : "Announcement turned off.");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update that announcement."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(announcement: AdminAnnouncement) {
    const ok = await confirm({
      title: "Delete this announcement?",
      description: "If it's showing, the site banner disappears immediately.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    setBusyId(announcement.id);
    try {
      await adminRequest(`/api/announcements/${announcement.id}`, { method: "DELETE" });
      toast.success("Announcement deleted.");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete that announcement."));
    } finally {
      setBusyId(null);
    }
  }

  // The site banner shows only the newest active announcement (list is
  // already newest-first), so mark which one visitors actually see.
  const liveId = announcements.find((a) => a.isActive)?.id;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Site"
        title="Announcements"
        description="The slim banner above the site navigation. Only the newest active announcement is shown."
        actions={
          <button type="button" onClick={openCreateForm} className={buttonClass("primary", "sm")}>
            <Plus className="h-4 w-4" aria-hidden />
            New announcement
          </button>
        }
      />

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-5 w-5" />}
          title="No announcements"
          description="Use the banner for availability, openings or news. Nothing shows on the site until you add one."
          action={
            <button type="button" onClick={openCreateForm} className={buttonClass("primary", "sm")}>
              Write your first announcement →
            </button>
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-raised">
          {announcements.map((announcement) => {
            const busy = busyId === announcement.id;
            return (
              <li
                key={announcement.id}
                className="flex flex-col gap-4 border-b border-line px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.02] sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {announcement.id === liveId ? (
                      <StatusPill tone="success">On site now</StatusPill>
                    ) : announcement.isActive ? (
                      <StatusPill tone="neutral">Active · superseded</StatusPill>
                    ) : (
                      <StatusPill tone="neutral" dot={false}>
                        Off
                      </StatusPill>
                    )}
                    <span className="text-xs text-faint">{formatDate(announcement.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-fg/90">{announcement.message}</p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <Switch
                      checked={announcement.isActive}
                      onChange={(value) => toggleActive(announcement, value)}
                      disabled={busy}
                      label="Active"
                    />
                    <span className="sm:sr-only">Active</span>
                  </label>
                  <div className="flex gap-1.5">
                    <IconButton
                      label="Edit announcement"
                      onClick={() => {
                        setEditingValues({ id: announcement.id, message: announcement.message, isActive: announcement.isActive });
                        setIsFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Delete announcement" tone="danger" disabled={busy} onClick={() => handleDelete(announcement)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AnnouncementFormModal
        key={editingValues?.id ?? "new"}
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
