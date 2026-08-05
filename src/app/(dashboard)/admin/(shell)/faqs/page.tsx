import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { FaqsManager } from "@/components/admin/faqs-manager";

export const metadata: Metadata = { title: "FAQ" };

export default async function AdminFaqsPage() {
  const faqs = await prisma.faqItem.findMany({ orderBy: { order: "asc" } });

  return <FaqsManager faqs={faqs} />;
}
