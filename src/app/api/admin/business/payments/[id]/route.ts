import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { paymentFields } from "@/lib/business-schemas";
import { adminRoute, auditSnapshot, BusinessError, dayToDate } from "@/lib/business-api";
import { auditLog } from "@/lib/crm";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.union([paymentFields, z.object({ restore: z.literal(true) })]);

/// Edit or restore a payment. The before/after values go to the audit log,
/// and every balance is recomputed from the rows, so totals stay correct.
export function PATCH(request: NextRequest, { params }: Params) {
  return adminRoute(request, async (session) => {
    const { id } = await params;
    const input = patchSchema.parse(await request.json());
    const before = await prisma.clientPayment.findUnique({ where: { id } });
    if (!before) throw new BusinessError("Payment not found", 404);

    if ("restore" in input) {
      await prisma.clientPayment.update({ where: { id }, data: { deletedAt: null } });
      await auditLog(session.email, "business.payment.restore", id, auditSnapshot(before) as never);
      return NextResponse.json({ ok: true });
    }
    if (before.deletedAt) throw new BusinessError("Restore this payment before editing it.");

    const after = await prisma.$transaction(async (tx) => {
      const project = await tx.clientProject.findUnique({ where: { id: input.projectId }, select: { id: true, clientId: true, deletedAt: true } });
      if (!project || project.deletedAt) throw new BusinessError("That project wasn't found.", 404);
      return tx.clientPayment.update({
        where: { id },
        data: {
          clientId: project.clientId,
          projectId: project.id,
          kind: input.kind,
          amountKobo: BigInt(input.amount),
          paidOn: dayToDate(input.paidOn)!,
          method: input.method,
          reference: input.reference,
        },
      });
    });
    await auditLog(session.email, "business.payment.update", id, auditSnapshot({ before, after }) as never);
    return NextResponse.json({ ok: true });
  });
}

/// Soft delete: excluded from every total, kept for the record, restorable.
export function DELETE(request: NextRequest, { params }: Params) {
  return adminRoute(request, async (session) => {
    const { id } = await params;
    const payment = await prisma.clientPayment.findUnique({ where: { id } });
    if (!payment) throw new BusinessError("Payment not found", 404);
    if (!payment.deletedAt) await prisma.clientPayment.update({ where: { id }, data: { deletedAt: new Date() } });
    await auditLog(session.email, "business.payment.delete", id, auditSnapshot(payment) as never);
    return NextResponse.json({ ok: true });
  });
}
