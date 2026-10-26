import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { receiptSettingsSchema } from "@/lib/business-schemas";
import { adminRoute, auditSnapshot } from "@/lib/business-api";
import { auditLog } from "@/lib/crm";

/// Business details printed on new receipts. Existing receipts keep the
/// details they were issued with.
export function PUT(request: NextRequest) {
  return adminRoute(request, async (session) => {
    const input = receiptSettingsSchema.parse(await request.json());
    const before = await prisma.receiptSettings.findUnique({ where: { id: "singleton" } });
    const after = await prisma.receiptSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", ...input }, update: input });
    await auditLog(session.email, "receipt.settings.update", "singleton", auditSnapshot({ before, after }) as never);
    return NextResponse.json({ ok: true });
  });
}
