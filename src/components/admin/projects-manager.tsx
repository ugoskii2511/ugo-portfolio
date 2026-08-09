"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/reveal";
import { useSpotlight } from "@/lib/use-spotlight";
import { useToast } from "@/components/admin/toast-provider";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { ProjectFormModal, type ProjectFormValues } from "@/components/admin/project-form-modal";

export type AdminProject = {
  id: string;
  name: string;
  summary: string;
  liveUrl: string | null;
  imageUrl: string | null;
  techStack: string[];
  featured: boolean;
  order: number;
};

export function ProjectsManager({ projects }: { projects: AdminProject[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingValues, setEditingValues] = useState<ProjectFormValues | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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
      router.replace("/admin/projects");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openEditForm(project: AdminProject) {
    setEditingValues({
      id: project.id,
      name: project.name,
      summary: project.summary,
      liveUrl: project.liveUrl ?? "",
      imageUrl: project.imageUrl ?? "",
      techStack: project.techStack.join(", "),
      featured: project.featured,
      order: project.order,
    });
    setIsFormOpen(true);
  }

  async function handleDelete(project: AdminProject) {
    const ok = await confirm({
      title: `Delete "${project.name}"?`,
      description: "This removes it from your public portfolio immediately. This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    setDeletingId(project.id);
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success(`"${project.name}" deleted.`);
      router.refresh();
    } catch {
      toast.error("Couldn't delete that project. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.techStack.some((t) => t.toLowerCase().includes(q))
    );
  }, [projects, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-foreground/60">Manage your portfolio showcase.</p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Project
        </button>
      </div>

      {projects.length > 0 && (
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-full border border-border-subtle bg-surface py-2 pl-9 pr-3.5 text-sm outline-none ring-primary/40 transition focus:ring-2"
          />
        </div>
      )}

      {projects.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-foreground/60">
          No projects yet — add your first one.
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-foreground/60">
          No projects match &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((project, index) => (
            <ProjectRow
              key={project.id}
              project={project}
              index={index}
              onEdit={() => openEditForm(project)}
              onDelete={() => handleDelete(project)}
              isDeleting={deletingId === project.id}
            />
          ))}
        </div>
      )}

      <ProjectFormModal
        key={editingValues?.id ?? "new"}
        isOpen={isFormOpen}
        initialValues={editingValues}
        onClose={() => setIsFormOpen(false)}
        onSaved={(wasEditing) => {
          toast.success(wasEditing ? "Project updated." : "Project added.");
          router.refresh();
        }}
      />
    </div>
  );
}

function ProjectRow({
  project,
  index,
  onEdit,
  onDelete,
  isDeleting,
}: {
  project: AdminProject;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const { onMouseMove, onMouseLeave, spotlightStyle } = useSpotlight();

  return (
    <Reveal
      delay={Math.min(index, 6) * 40}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="glass-panel relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="pointer-events-none absolute inset-0" style={spotlightStyle} />
      <div className="flex flex-1 gap-4">
        {project.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.imageUrl}
            alt=""
            className="hidden h-16 w-24 shrink-0 rounded-lg object-cover sm:block"
          />
        ) : (
          <div className="hidden h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-soft to-transparent font-serif text-2xl font-bold text-primary/40 sm:flex">
            {project.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{project.name}</h3>
            {project.featured && <Badge>Featured</Badge>}
          </div>
          <p className="mt-1 text-sm text-foreground/70">{project.summary}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {project.techStack.map((tech) => (
              <Badge key={tech}>{tech}</Badge>
            ))}
          </div>
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark"
            >
              View live
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle transition hover:border-primary/40 hover:text-primary"
          aria-label={`Edit ${project.name}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
          aria-label={`Delete ${project.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Reveal>
  );
}
