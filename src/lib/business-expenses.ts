import "server-only";
import type { z } from "zod";
import type { prisma } from "@/lib/db";
import type { expenseFields } from "@/lib/business-schemas";
import { BusinessError, dayToDate } from "@/lib/business-api";

type ExpenseInput = z.infer<typeof expenseFields>;

/// Link checks: a project implies its client; a client alone is allowed.
export async function resolveLinks(tx: Pick<typeof prisma, "clientProject" | "client">, input: Pick<ExpenseInput, "projectId" | "clientId">) {
  if (input.projectId) {
    const project = await tx.clientProject.findUnique({ where: { id: input.projectId }, select: { id: true, clientId: true, deletedAt: true } });
    if (!project || project.deletedAt) throw new BusinessError("That project wasn't found.", 404);
    return { projectId: project.id, clientId: project.clientId };
  }
  if (input.clientId) {
    const client = await tx.client.findUnique({ where: { id: input.clientId }, select: { id: true, deletedAt: true } });
    if (!client || client.deletedAt) throw new BusinessError("That client wasn't found.", 404);
    return { projectId: null, clientId: client.id };
  }
  return { projectId: null, clientId: null };
}

export function expenseData(item: ExpenseInput, links: { projectId: string | null; clientId: string | null }) {
  return {
    name: item.name,
    amountKobo: BigInt(item.amount),
    category: item.category,
    spentOn: dayToDate(item.spentOn)!,
    notes: item.notes,
    method: item.method,
    projectId: links.projectId,
    clientId: links.clientId,
  };
}

