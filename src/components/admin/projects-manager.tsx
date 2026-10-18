"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, FolderKanban, ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { useToast } from "@/components/admin/toast-provider";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { ProjectFormModal, type ProjectFormValues } from "@/components/admin/project-form-modal";
import { EmptyState, IconButton, PageHeader, SearchInput, Segmented, StatusPill, Switch } from "@/components/admin/ui";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";

export type AdminProject = {
  id: string;
  name: string;
  summary: string;
  liveUrl: string | null;
  imageUrl: string | null;
  techStack: string[];
  featured: boolean;
  order: number;
  publicName: string;
  category: string;
  slug: string;
};

type Filter = "all" | "featured" | "standard";

export function ProjectsManager({ projects }: { projects: AdminProject[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingValues, setEditingValues] = useState<ProjectFormValues | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

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
      techStack: project.techStack,
      featured: project.featured,
      order: project.order,
    });
    setIsFormOpen(true);
  }

  async function handleToggleFeatured(project: AdminProject, featured: boolean) {
    setBusyId(project.id);
    try {
      await adminRequest(`/api/projects/${project.id}`, { method: "PATCH", body: { featured } });
      toast.success(featured ? `"${project.publicName}" is now featured.` : `"${project.publicName}" is no longer featured.`);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update that project."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(project: AdminProject) {
    const ok = await confirm({
      title: `Delete "${project.publicName}"?`,
      description: "It's removed from your public portfolio and its case study immediately. This can't be undone.",
      confirmLabel: "Delete project",
      danger: true,
    });
    if (!ok) return;

    setBusyId(project.id);
    try {
      await adminRequest(`/api/projects/${project.id}`, { method: "DELETE" });
      toast.success(`"${project.publicName}" deleted.`);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete that project."));
    } finally {
      setBusyId(null);
    }
  }

  const featuredCount = projects.filter((p) => p.featured).length;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter === "featured" && !p.featured) return false;
      if (filter === "standard" && p.featured) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.publicName.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.techStack.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [projects, query, filter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Portfolio"
        title="Projects"
        description="Everything shown on /work and the homepage showcase. Featured projects lead the homepage."
        actions={
          <button type="button" onClick={openCreateForm} className={buttonClass("primary", "sm")}>
            <Plus className="h-4 w-4" aria-hidden />
            Add project
          </button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-5 w-5" />}
          title="No projects yet"
          description="Add your first project and it appears on your public portfolio right away."
          action={
            <button type="button" onClick={openCreateForm} className={buttonClass("primary", "sm")}>
              Add your first project →
            </button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search name, summary or stack…"
              label="Search projects"
              className="w-full sm:max-w-sm"
            />
            <Segmented
              label="Filter projects"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: projects.length },
                { value: "featured", label: "Featured", count: featuredCount },
                { value: "standard", label: "Not featured", count: projects.length - featuredCount },
              ]}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-line px-5 py-12 text-center text-sm text-muted">
              No projects match {query ? <>&ldquo;{query}&rdquo;</> : "this filter"}.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-line bg-raised">
              <li
                aria-hidden
                className="hidden grid-cols-[4.5rem_minmax(0,1fr)_7rem_7.5rem_8.5rem] gap-5 border-b border-line px-5 py-3 lg:grid"
              >
                {["", "Project", "Order", "Featured", ""].map((heading, index) => (
                  <span key={index} className="label-mono !text-[0.6rem]">
                    {heading}
                  </span>
                ))}
              </li>
              {filtered.map((project) => (
                <li
                  key={project.id}
                  className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4 border-b border-line px-4 py-4 transition-colors last:border-b-0 hover:bg-white/[0.02] sm:px-5 lg:grid-cols-[4.5rem_minmax(0,1fr)_7rem_7.5rem_8.5rem] lg:items-center lg:gap-5"
                >
                  <div className="row-span-2 overflow-hidden rounded-lg border border-line bg-raised-2 lg:row-span-1">
                    {project.imageUrl ? (
                      // Admin thumbnails load the stored URL directly; any host is allowed here.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.imageUrl} alt="" loading="lazy" className="aspect-[10/16] w-full object-cover object-top" />
                    ) : (
                      <div className="flex aspect-[10/16] items-center justify-center text-faint">
                        <ImageOff className="h-4 w-4" aria-label="No image" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-[0.95rem] font-semibold tracking-tight">{project.publicName}</h2>
                      <StatusPill dot={false}>{project.category}</StatusPill>
                    </div>
                    {project.publicName !== project.name && (
                      <p className="mt-0.5 truncate font-mono text-[0.68rem] text-faint">Admin name: {project.name}</p>
                    )}
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{project.summary}</p>
                    {project.techStack.length > 0 && (
                      <ul aria-label="Tech stack" className="mt-2.5 flex flex-wrap gap-1.5">
                        {project.techStack.slice(0, 5).map((tech) => (
                          <li key={tech} className="rounded-md border border-line bg-white/[0.025] px-1.5 py-0.5 font-mono text-[0.65rem] text-muted">
                            {tech}
                          </li>
                        ))}
                        {project.techStack.length > 5 && (
                          <li className="px-1 py-0.5 font-mono text-[0.65rem] text-faint">+{project.techStack.length - 5}</li>
                        )}
                      </ul>
                    )}
                  </div>

                  {/* Mobile: meta + actions in one row under the text */}
                  <div className="col-start-2 flex flex-wrap items-center justify-between gap-3 lg:contents">
                    <p className="font-mono text-xs text-muted lg:text-sm">
                      <span className="lg:hidden">Order </span>
                      {project.order}
                    </p>
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <Switch
                        checked={project.featured}
                        onChange={(value) => handleToggleFeatured(project, value)}
                        disabled={busyId === project.id}
                        label={`Feature ${project.publicName} on the homepage`}
                      />
                      <span className="lg:sr-only">Featured</span>
                    </label>
                    <div className="flex items-center gap-1.5 lg:justify-end">
                      <a
                        href={`/work/${project.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${project.publicName} case study (new tab)`}
                        title="Open case study"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-fg"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                      <IconButton label={`Edit ${project.publicName}`} onClick={() => openEditForm(project)}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label={`Delete ${project.publicName}`}
                        tone="danger"
                        disabled={busyId === project.id}
                        onClick={() => handleDelete(project)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ProjectFormModal
        key={editingValues?.id ?? "new"}
        isOpen={isFormOpen}
        initialValues={editingValues}
        onClose={() => setIsFormOpen(false)}
        onSaved={(wasEditing) => {
          toast.success(wasEditing ? "Project updated." : "Project added to your portfolio.");
          router.refresh();
        }}
      />
    </div>
  );
}
