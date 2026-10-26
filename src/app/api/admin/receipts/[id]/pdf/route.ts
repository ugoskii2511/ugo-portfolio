import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { adminRoute, BusinessError } from "@/lib/business-api";
import { snapshotOf } from "@/lib/receipts";
import { renderReceiptPdf } from "@/lib/receipt-pdf";
import { receiptFileName } from "@/lib/receipt-calc";

type Params = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

/// The receipt as a PDF, generated from its stored snapshot. Admin only and
/// never cached; there is no public link to a receipt.
export function GET(request: NextRequest, { params }: Params) {
  return adminRoute(request, async () => {
    const { id } = await params;
    const receipt = await prisma.receipt.findUnique({ where: { id }, select: { data: true, number: true, status: true, voidReason: true, voidedAt: true } });
    if (!receipt) throw new BusinessError("Receipt not found", 404);
    const bytes = await renderReceiptPdf(snapshotOf(receipt), {
      voided: receipt.status === "VOIDED" ? { reason: receipt.voidReason, at: receipt.voidedAt?.toISOString() ?? null } : null,
    });
    const name = receiptFileName(receipt.number);
    const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${name}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  });
}
