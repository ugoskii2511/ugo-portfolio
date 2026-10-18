import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { expenseFields } from "@/lib/business-schemas";
import { adminRoute, auditSnapshot, BusinessError } from "@/lib/business-api";
import { auditLog } from "@/lib/crm";
import { expenseData, resolveLinks } from "@/lib/business-expenses";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.union([expenseFields, z.object({ restore: z.literal(true) })]);

export function PATCH(request: NextRequest, { params }: Params) {
  return adminRoute(request, async (session) => {
    const { id } = await params;
    const input = patchSchema.parse(await request.json());
    const before = await prisma.expense.findUnique({ where: { id } });
    if (!before) throw new BusinessError("Expense not found", 404);
    if ("restore" in input) {
      await prisma.expense.update({ where: { id }, data: { deletedAt: null } });
      await auditLog(session.email, "business.expense.restore", id, auditSnapshot(before) as never);
      return NextResponse.json({ ok: true });
    }
    if (before.deletedAt) throw new BusinessError("Restore this expense before editing it.");
    const after = await prisma.$transaction(async (tx) => {
      const links = await resolveLinks(tx, input);
      return tx.expense.update({ where: { id }, data: expenseData(input, links) });
    });
    await auditLog(session.email, "business.expense.update", id, auditSnapshot({ before, after }) as never);
    return NextResponse.json({ ok: true });
  });
}

export function DELETE(request: NextRequest, { params }: Params) {
  return adminRoute(request, async (session) => {
    const { id } = await params;
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new BusinessError("Expense not found", 404);
    if (!expense.deletedAt) await prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
    await auditLog(session.email, "business.expense.delete", id, auditSnapshot(expense) as never);
    return NextResponse.json({ ok: true });
  });
}
