import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { createExpenseSchema } from "@/lib/business-schemas";
import { expenseData, resolveLinks } from "@/lib/business-expenses";
import { adminRoute, auditSnapshot } from "@/lib/business-api";
import { auditLog } from "@/lib/crm";

/// One expense, or several from the calculator, saved atomically.
export function POST(request: NextRequest) {
  return adminRoute(request, async (session) => {
    const input = createExpenseSchema.parse(await request.json());
    const items = "items" in input ? input.items : [input];
    const requestId = input.clientRequestId;

    if (requestId) {
      const existing = await prisma.expense.findMany({ where: { clientRequestId: { startsWith: requestId } }, select: { id: true } });
      if (existing.length) return NextResponse.json({ ids: existing.map((e) => e.id), alreadyRecorded: true });
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        const rows = [];
        for (const [index, item] of items.entries()) {
          const links = await resolveLinks(tx, item);
          rows.push(
            await tx.expense.create({
              data: { ...expenseData(item, links), clientRequestId: requestId ? `${requestId}:${index}` : null },
            })
          );
        }
        return rows;
      });
      for (const row of created) await auditLog(session.email, "business.expense.create", row.id, auditSnapshot(row) as never);
      return NextResponse.json({ ids: created.map((r) => r.id) }, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && requestId) {
        const existing = await prisma.expense.findMany({ where: { clientRequestId: { startsWith: requestId } }, select: { id: true } });
        return NextResponse.json({ ids: existing.map((e) => e.id), alreadyRecorded: true });
      }
      throw error;
    }
  });
}

