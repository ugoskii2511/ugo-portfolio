import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { projectFields } from "@/lib/business-schemas";
import { adminRoute, auditSnapshot, bigOrNull, BusinessError, dayToDate } from "@/lib/business-api";
import { auditLog } from "@/lib/crm";
import { lagosToday } from "@/lib/business-calc";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.union([projectFields, z.object({ restore: z.literal(true) })]);

export function PATCH(request: NextRequest, { params }: Params) {
  return adminRoute(request, async (session) => {
    const { id } = await params;
    const input = patchSchema.parse(await request.json());
    const before = await prisma.clientProject.findUnique({ where: { id } });
    if (!before) throw new BusinessError("Project not found", 404);
    if ("restore" in input) {
      await prisma.clientProject.update({ where: { id }, data: { deletedAt: null } });
      await auditLog(session.email, "business.project.restore", id);
      return NextResponse.json({ ok: true });
    }
    if (before.deletedAt) throw new BusinessError("Restore this project before editing it.");
    const after = await prisma.clientProject.update({
      where: { id },
      data: {
        title: input.title,
        serviceType: input.serviceType,
        description: input.description,
        priceKobo: bigOrNull(input.price),

        additionalChargesKobo: bigOrNull(input.additionalCharges),

        discountKobo: bigOrNull(input.discount),

        referenceNumber: input.referenceNumber,
        status: input.status,
        startDate: dayToDate(input.startDate),
        expectedDeliveryDate: dayToDate(input.expectedDeliveryDate),
        // Marking a project completed without a date records today (Lagos).
        completedDate: input.completedDate
          ? dayToDate(input.completedDate)
          : input.status === "COMPLETED"
            ? (before.completedDate ?? dayToDate(lagosToday()))
            : null,
        maintenanceFeeKobo: bigOrNull(input.maintenanceFee),
        maintenanceInterval: input.maintenanceInterval,
        nextPaymentDate: dayToDate(input.nextPaymentDate),
      },
    });
    await auditLog(session.email, "business.project.update", id, auditSnapshot({ before, after }) as never);
    return NextResponse.json({ ok: true });
  });
}

/// Soft delete. Its payments leave the totals with it; restore brings both back.
export function DELETE(request: NextRequest, { params }: Params) {
  return adminRoute(request, async (session) => {
    const { id } = await params;
    const project = await prisma.clientProject.findUnique({ where: { id } });
    if (!project) throw new BusinessError("Project not found", 404);
    if (!project.deletedAt) await prisma.clientProject.update({ where: { id }, data: { deletedAt: new Date() } });
    await auditLog(session.email, "business.project.delete", id, auditSnapshot({ title: project.title }) as never);
    return NextResponse.json({ ok: true });
  });
}
