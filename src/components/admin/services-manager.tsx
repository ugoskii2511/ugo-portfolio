"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { useToast } from "@/components/admin/toast-provider";
import { useConfirm } from "@/components/admin/confirm-dialog";
import {
  ServiceCategoryFormModal,
  type ServiceCategoryFormValues,
} from "@/components/admin/service-category-form-modal";
import {
  ServiceItemFormModal,
  type ServiceItemFormValues,
} from "@/components/admin/service-item-form-modal";
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

  const [expandedId, setExpandedId] = useState<string | null>(categories[0]?.id ?? null);

  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategoryFormValues | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [itemFormCategoryId, setItemFormCategoryId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ServiceItemFormValues | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  function openCreateCategoryForm() {
    setEditingCategory(null);
    setIsCategoryFormOpen(true);
  }

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openCreateCategoryForm();
      router.replace("/admin/services");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openEditCategoryForm(category: AdminServiceCategory) {
    setEditingCategory({
      id: category.id,
      title: category.title,
      description: category.description,
      icon: category.icon,
      order: category.order,
    });
    setIsCategoryFormOpen(true);
  }

  async function handleDeleteCategory(category: AdminServiceCategory) {
    const ok = await confirm({
      title: "Delete this category?",
      description: `This also deletes all ${category.services.length} service(s) inside it. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    setDeletingCategoryId(category.id);
    try {
      const response = await fetch(`/api/service-categories/${category.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed");
      toast.success("Category deleted.");
      router.refresh();
    } catch {
      toast.error("Couldn't delete that category.");
    } finally {
      setDeletingCategoryId(null);
    }
  }

  function openCreateItemForm(categoryId: string) {
    setItemFormCategoryId(categoryId);
    setEditingItem(null);
    setIsItemFormOpen(true);
  }

  function openEditItemForm(item: AdminServiceItem) {
    setItemFormCategoryId(item.categoryId);
    setEditingItem(item);
    setIsItemFormOpen(true);
  }

  async function handleDeleteItem(item: AdminServiceItem) {
    const ok = await confirm({
      title: "Delete this service?",
      description: "It will be removed from the Services page and booking form immediately.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    setDeletingItemId(item.id);
    try {
      const response = await fetch(`/api/service-items/${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed");
      toast.success("Service deleted.");
      router.refresh();
    } catch {
      toast.error("Couldn't delete that service.");
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Manage the categories and individual services shown on the Services page and booking
            form.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateCategoryForm}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-foreground/60">
          No service categories yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((category) => {
            const isExpanded = expandedId === category.id;
            return (
              <div key={category.id} className="glass-panel overflow-hidden rounded-2xl">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : category.id)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                        {category.icon}
                      </span>
                      <p className="font-semibold">{category.title}</p>
                      <span className="text-xs text-foreground/50">
                        {category.services.length} service{category.services.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-foreground/70">{category.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditCategoryForm(category);
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label="Edit category"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle transition hover:border-primary/40 hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </span>
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteCategory(category);
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label="Delete category"
                      className={clsx(
                        "flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-red-500 transition hover:bg-red-500/10",
                        deletingCategoryId === category.id && "opacity-50"
                      )}
                    >
                      <Trash2 className="h-4 w-4" />
                    </span>
                    <ChevronDown
                      className={clsx(
                        "h-4 w-4 text-foreground/50 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border-subtle p-5">
                    <div className="flex flex-col gap-2.5">
                      {category.services.map((service) => (
                        <div
                          key={service.id}
                          className="flex items-start justify-between gap-4 rounded-xl bg-surface px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{service.title}</p>
                            <p className="mt-0.5 text-xs text-foreground/60">{service.description}</p>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditItemForm(service)}
                              aria-label="Edit service"
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle transition hover:border-primary/40 hover:text-primary"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(service)}
                              disabled={deletingItemId === service.id}
                              aria-label="Delete service"
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {category.services.length === 0 && (
                        <p className="text-sm text-foreground/50">No services in this category yet.</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openCreateItemForm(category.id)}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:text-primary-dark"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Service
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ServiceCategoryFormModal
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
          isOpen={isItemFormOpen}
          categoryId={itemFormCategoryId}
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
