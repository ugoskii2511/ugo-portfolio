import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ProcessStepsManager } from "@/components/admin/process-steps-manager";

export const metadata: Metadata = { title: "Process Steps" };

export default async function AdminProcessPage() {
  const steps = await prisma.processStep.findMany({ orderBy: { order: "asc" } });

  return <ProcessStepsManager steps={steps} />;
}
