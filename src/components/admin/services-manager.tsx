"use client";

import { useEffect, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { ChevronDown, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { useToast } from "@/components/admin/toast-provider";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { ServiceCategoryFormModal, type ServiceCategoryFormValues } from "@/components/admin/service-category-form-modal";
import { ServiceItemFormModal, type ServiceItemFormValues } from "@/components/admin/service-item-form-modal";
import { EmptyState, IconButton, PageHeader } from "@/components/admin/ui";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";
import { SERVICE_ICONS } from "@/lib/service-icons";
import type { ServiceIcon } from "@/lib/services-data";

export type AdminServiceItem = {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  order: number;
};

export type AdminServiceCategory = {
  id: string;
  title: string;
  description: string;
  icon: ServiceIcon;
  order: number;
  services: AdminServiceItem[];
};

export function ServicesManager({ categories }: { categories: AdminServiceCategory[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const baseId = useId();

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(categories[0] ? [categories[0].id] : []));
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategoryFormValues | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [itemFormCategoryId, setItemFormCategoryId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ServiceItemFormValues | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const totalServices = categories.reduce((sum, c) => sum + c.services.length, 0);

  function openCreateCategoryForm() {
    setEditingCategory(null);
    setIsCategoryFormOpen(true);
  }

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      // Syncing UI state from the URL's query param is a legitimate
      // external-system read, not derivable during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openCreateCategoryForm();
      router.replace("/admin/services");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteCategory(category: AdminServiceCategory) {
    const ok = await confirm({
      title: `Delete "${category.title}"?`,
      description:
        category.services.length > 0
          ? `This also deletes the ${category.services.length} service${category.services.length === 1 ? "" : "s"} inside it. This can't be undone.`
          : "This can't be undone.",
      confirmLabel: "Delete category",
      danger: true,
    });
    if (!ok) return;
    setBusyId(category.id);
    try {
      await adminRequest(`/api/service-categories/${category.id}`, { method: "DELETE" });
      toast.success("Category deleted.");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete that category."));
    } finally {
      setBusyId(null);
    }
  }

  function openCreateItemForm(categoryId: string) {
    setItemFormCategoryId(categoryId);
    setEditingItem(null);
    setIsItemFormOpen(true);
  }

  async function handleDeleteItem(item: AdminServiceItem) {
    const ok = await confirm({
      title: `Delete "${item.title}"?`,
      description: "It's removed from the Services page and the booking form immediately.",
      confirmLabel: "Delete service",
      danger: true,
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await adminRequest(`/api/service-items/${item.id}`, { method: "DELETE" });
      toast.success("Service deleted.");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete that service."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Portfolio"
        title="Services"
        description={`The catalogue on /services and the options in the booking form. ${categories.length} categories · ${totalServices} services.`}
        actions={
          <button type="button" onClick={openCreateCategoryForm} className={buttonClass("primary", "sm")}>
            <Plus className="h-4 w-4" aria-hidden />
            New category
          </button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-5 w-5" />}
          title="No service categories"
          description="Group what you offer into categories, then add bookable services to each."
          action={
            <button type="button" onClick={openCreateCategoryForm} className={buttonClass("primary", "sm")}>
              Create your first category →
            </button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {categories.map((category, index) => {
            const isOpen = expanded.has(category.id);
            const panelId = `${baseId}-${category.id}`;
            const Icon = SERVICE_ICONS[category.icon]?.icon ?? Wrench;
            return (
              <li key={category.id} className="overflow-hidden rounded-2xl border border-line bg-raised">
                <div className="flex items-center gap-2 pr-3 sm:pr-4">
                  <button
                    type="button"
                    onClick={() => toggle(category.id)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4 text-left sm:px-5"
                  >
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-raised-2 text-accent-bright">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="font-mono text-[0.65rem] text-faint">{String(index + 1).padStart(2, "0")}</span>
                        <span className="truncate font-medium tracking-tight">{category.title}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {category.services.length} service{category.services.length === 1 ? "" : "s"} · {category.description}
                      </span>
                    </span>
                    <ChevronDown
                      aria-hidden
                      className={clsx("h-4 w-4 shrink-0 text-faint transition-transform duration-300", isOpen && "rotate-180")}
                    />
                  </button>
                  <IconButton
                    label={`Edit category ${category.title}`}
                    onClick={() => {
                      setEditingCategory({
                        id: category.id,
                        title: category.title,
                        description: category.description,
                        icon: category.icon,
                        order: category.order,
                      });
                      setIsCategoryFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label={`Delete category ${category.title}`}
                    tone="danger"
                    disabled={busyId === category.id}
                    onClick={() => handleDeleteCategory(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>

                {isOpen && (
                  <div id={panelId} className="border-t border-line">
                    {category.services.length === 0 ? (
                      <p className="px-5 py-6 text-sm text-muted">No services in this category yet.</p>
                    ) : (
                      <ul className="divide-y divide-line">
                        {category.services.map((service) => (
                          <li key={service.id} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.02] sm:px-5 sm:pl-[4.75rem]">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{service.title}</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-muted">{service.description}</p>
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              <IconButton
                                label={`Edit ${service.title}`}
                                onClick={() => {
                                  setItemFormCategoryId(service.categoryId);
                                  setEditingItem(service);
                                  setIsItemFormOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </IconButton>
                              <IconButton
                                label={`Delete ${service.title}`}
                                tone="danger"
                                disabled={busyId === service.id}
                                onClick={() => handleDeleteItem(service)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </IconButton>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="border-t border-line px-4 py-3 sm:px-5 sm:pl-[4.75rem]">
                      <button type="button" onClick={() => openCreateItemForm(category.id)} className={buttonClass("ghost", "sm", "!px-0")}>
                        <Plus className="h-4 w-4" aria-hidden />
                        Add service to {category.title}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ServiceCategoryFormModal
        key={editingCategory?.id ?? "new"}
        isOpen={isCategoryFormOpen}
        initialValues={editingCategory}
        onClose={() => setIsCategoryFormOpen(false)}
        onSaved={(wasEditing) => {
          toast.success(wasEditing ? "Category updated." : "Category created.");
          router.refresh();
        }}
      />

      {itemFormCategoryId && (
        <ServiceItemFormModal
          key={editingItem?.id ?? `new-${itemFormCategoryId}`}
          isOpen={isItemFormOpen}
          categoryId={itemFormCategoryId}
          categoryTitle={categories.find((c) => c.id === itemFormCategoryId)?.title}
          initialValues={editingItem}
          onClose={() => setIsItemFormOpen(false)}
          onSaved={(wasEditing) => {
            toast.success(wasEditing ? "Service updated." : "Service created.");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
