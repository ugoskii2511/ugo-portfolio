import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { paymentFields } from "@/lib/business-schemas";
import { adminRoute, auditSnapshot, BusinessError, dayToDate } from "@/lib/business-api";
import { auditLog } from "@/lib/crm";
import { voidReceiptsForPayment } from "@/lib/receipts";
import { PAYMENT_RECORD_STATUSES } from "@/lib/receipt-calc";

type Params = { params: Promise<{ id: string }> };

const statusSchema = z
  .object({
    status: z.enum(PAYMENT_RECORD_STATUSES),
    reason: z.string().trim().max(500).nullish().transform((v) => (v ? v : null)),
  })
  .refine((v) => v.status === "CONFIRMED" || v.reason, { message: "Say briefly why (e.g. “transfer reversed by the bank”).", path: ["reason"] });

const patchSchema = z.union([paymentFields, z.object({ restore: z.literal(true) }), statusSchema]);

/// Edit, restore or change the status of a payment. The before/after values
/// go to the audit log, and every balance is recomputed from the rows, so
/// totals stay correct. Any receipt issued for the old figures is voided
/// (kept on record) so a receipt never disagrees with the payment.
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

    if ("status" in input && !("amount" in input)) {
      if (input.status === before.status) return NextResponse.json({ ok: true });
      const voided = await prisma.$transaction(async (tx) => {
        await tx.clientPayment.update({ where: { id }, data: { status: input.status, statusReason: input.reason } });
        return input.status === "CONFIRMED" ? [] : voidReceiptsForPayment(tx, id, `Payment marked ${input.status.toLowerCase()}: ${input.reason}`, session.email);
      });
      await auditLog(session.email, "business.payment.status", id, { from: before.status, to: input.status, reason: input.reason, voidedReceipts: voided });
      return NextResponse.json({ ok: true, receiptVoided: voided.length > 0 });
    }
    const fields = input as z.infer<typeof paymentFields>;

    const { after, voided } = await prisma.$transaction(async (tx) => {
      const project = await tx.clientProject.findUnique({ where: { id: fields.projectId }, select: { id: true, clientId: true, deletedAt: true } });
      if (!project || project.deletedAt) throw new BusinessError("That project wasn't found.", 404);
      const after = await tx.clientPayment.update({
        where: { id },
        data: {
          clientId: project.clientId,
          projectId: project.id,
          kind: fields.kind,
          amountKobo: BigInt(fields.amount),
          paidOn: dayToDate(fields.paidOn)!,
          method: fields.method,
          reference: fields.reference,
          description: fields.description,
          notes: fields.notes,
        },
      });
      // Notes are internal and never printed, so changing only them keeps the receipt valid.
      const printed = (["clientId", "projectId", "kind", "amountKobo", "paidOn", "method", "reference", "description"] as const).some(
        (k) => String(before[k] instanceof Date ? (before[k] as Date).toISOString() : before[k]) !== String(after[k] instanceof Date ? (after[k] as Date).toISOString() : after[k])
      );
      const voided = printed ? await voidReceiptsForPayment(tx, id, "Payment details were edited after the receipt was issued.", session.email) : [];
      return { after, voided };
    });
    await auditLog(session.email, "business.payment.update", id, auditSnapshot({ before, after, voidedReceipts: voided }) as never);
    return NextResponse.json({ ok: true, receiptVoided: voided.length > 0 });
  });
}

/// Soft delete: excluded from every total, kept for the record, restorable.
/// Its receipt is voided (a receipt must never outlive its payment).
export function DELETE(request: NextRequest, { params }: Params) {
  return adminRoute(request, async (session) => {
    const { id } = await params;
    const payment = await prisma.clientPayment.findUnique({ where: { id } });
    if (!payment) throw new BusinessError("Payment not found", 404);
    const voided = await prisma.$transaction(async (tx) => {
      if (!payment.deletedAt) await tx.clientPayment.update({ where: { id }, data: { deletedAt: new Date() } });
      return voidReceiptsForPayment(tx, id, "Payment was deleted.", session.email);
    });
    await auditLog(session.email, "business.payment.delete", id, auditSnapshot({ ...payment, voidedReceipts: voided }) as never);
    return NextResponse.json({ ok: true });
  });
}
