import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { projectFields } from "@/lib/business-schemas";
import { adminRoute, auditSnapshot, bigOrNull, BusinessError, dayToDate } from "@/lib/business-api";
import { auditLog } from "@/lib/crm";
import { lagosToday } from "@/lib/business-calc";

const schema = z.intersection(z.object({ clientId: z.string().min(1) }), projectFields);

export function POST(request: NextRequest) {
  return adminRoute(request, async (session) => {
    const input = schema.parse(await request.json());
    const client = await prisma.client.findUnique({ where: { id: input.clientId }, select: { deletedAt: true } });
    if (!client || client.deletedAt) throw new BusinessError("Client not found", 404);
    const project = await prisma.clientProject.create({
      data: {
        clientId: input.clientId,
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
        completedDate: dayToDate(input.completedDate) ?? (input.status === "COMPLETED" ? dayToDate(lagosToday()) : null),
        maintenanceFeeKobo: bigOrNull(input.maintenanceFee),
        maintenanceInterval: input.maintenanceInterval,
        nextPaymentDate: dayToDate(input.nextPaymentDate),
      },
    });
    await auditLog(session.email, "business.project.create", project.id, auditSnapshot(project) as never);
    return NextResponse.json({ id: project.id }, { status: 201 });
  });
}
