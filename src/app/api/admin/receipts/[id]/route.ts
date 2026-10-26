import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { reissueReceiptSchema, voidReceiptSchema } from "@/lib/business-schemas";
import { adminRoute, BusinessError } from "@/lib/business-api";
import { lagosToday } from "@/lib/business-calc";
import { auditLog } from "@/lib/crm";
import { issueReceipt } from "@/lib/receipts";

type Params = { params: Promise<{ id: string }> };

const schema = z.discriminatedUnion("action", [voidReceiptSchema, reissueReceiptSchema]);

/// Void a receipt (kept on record, marked VOID, reason logged), or reissue:
/// void it if it's still issued and issue a fresh receipt, with a new
/// number, from the payment's current details.
export function PATCH(request: NextRequest, { params }: Params) {
  return adminRoute(request, async (session) => {
    const { id } = await params;
    const input = schema.parse(await request.json());
    const receipt = await prisma.receipt.findUnique({ where: { id }, select: { id: true, number: true, status: true, paymentId: true } });
    if (!receipt) throw new BusinessError("Receipt not found", 404);

    if (input.action === "void") {
      if (receipt.status === "VOIDED") return NextResponse.json({ ok: true });
      await prisma.receipt.update({ where: { id }, data: { status: "VOIDED", voidReason: input.reason, voidedAt: new Date(), voidedBy: session.email } });
      await auditLog(session.email, "receipt.void", id, { number: receipt.number, reason: input.reason });
      return NextResponse.json({ ok: true });
    }

    const issueDate = input.issueDate ?? lagosToday();
    if (issueDate > lagosToday()) throw new BusinessError("The issue date can't be in the future.");
    const fresh = await prisma.$transaction(
      async (tx) => {
        if (receipt.status === "ISSUED") {
          await tx.receipt.update({
            where: { id },
            data: { status: "VOIDED", voidReason: input.reason || "Replaced by a reissued receipt.", voidedAt: new Date(), voidedBy: session.email },
          });
        }
        return issueReceipt(tx, receipt.paymentId, session.email, issueDate);
      },
      { timeout: 30_000, maxWait: 10_000 }
    );
    if (receipt.status === "ISSUED") await auditLog(session.email, "receipt.void", id, { number: receipt.number, reason: input.reason || `Replaced by ${fresh.number}` });
    await auditLog(session.email, "receipt.reissue", fresh.id, { replaces: receipt.number, number: fresh.number, reason: input.reason ?? null });
    return NextResponse.json({ id: fresh.id, number: fresh.number });
  });
}
