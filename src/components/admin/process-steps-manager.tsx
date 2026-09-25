"use client";

import { ListOrdered } from "lucide-react";
import { OrderedListManager, type OrderedListConfig } from "@/components/admin/ordered-list-manager";

export type AdminProcessStep = { id: string; title: string; description: string; order: number };

const CONFIG: OrderedListConfig = {
  endpoint: "/api/process-steps",
  path: "/admin/process",
  keys: { primary: "title", secondary: "description" },
  labels: { primary: "Title", secondary: "Description" },
  limits: { primary: 80, secondary: 300 },
  placeholders: { primary: "e.g. Discover" },
  noun: "step",
  eyebrow: "Portfolio",
  title: "Process",
  description: "The steps in the process timeline on the homepage and About page.",
  emptyTitle: "No process steps",
  emptyDescription: "Describe how a project moves from first conversation to launch.",
  deleteDescription: "It's removed from the process timeline immediately.",
  numbered: true,
  orderHint: "Lower numbers appear first. The 01, 02… labels come from position, not this value.",
};

export function ProcessStepsManager({ steps }: { steps: AdminProcessStep[] }) {
  return (
    <OrderedListManager
      config={CONFIG}
      icon={<ListOrdered className="h-5 w-5" />}
      items={steps.map((step) => ({ id: step.id, primary: step.title, secondary: step.description, order: step.order }))}
    />
  );
}
