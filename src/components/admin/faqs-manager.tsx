"use client";

import { HelpCircle } from "lucide-react";
import { OrderedListManager, type OrderedListConfig } from "@/components/admin/ordered-list-manager";

export type AdminFaq = { id: string; question: string; answer: string; order: number };

const CONFIG: OrderedListConfig = {
  endpoint: "/api/faqs",
  path: "/admin/faqs",
  keys: { primary: "question", secondary: "answer" },
  labels: { primary: "Question", secondary: "Answer" },
  limits: { primary: 200, secondary: 1000 },
  placeholders: { primary: "e.g. How long does a typical project take?" },
  noun: "FAQ",
  eyebrow: "Portfolio",
  title: "FAQ",
  description: "The questions answered on the About page, in display order.",
  emptyTitle: "No FAQ items",
  emptyDescription: "Answer the questions clients ask before they hire you. They appear on the About page.",
  deleteDescription: "It's removed from the About page immediately.",
};

export function FaqsManager({ faqs }: { faqs: AdminFaq[] }) {
  return (
    <OrderedListManager
      config={CONFIG}
      icon={<HelpCircle className="h-5 w-5" />}
      items={faqs.map((faq) => ({ id: faq.id, primary: faq.question, secondary: faq.answer, order: faq.order }))}
    />
  );
}
