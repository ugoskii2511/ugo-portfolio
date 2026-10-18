import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClientSchema } from "@/lib/business-schemas";
import { adminRoute, auditSnapshot, bigOrNull, dayToDate } from "@/lib/business-api";
import { auditLog } from "@/lib/crm";
import { lagosToday } from "@/lib/business-calc";

/// Create a client, optionally with their first project, in one transaction.
export function POST(request: NextRequest) {
  return adminRoute(request, async (session) => {
    const input = createClientSchema.parse(await request.json());
    const { project, ...client } = input;
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.client.create({ data: client });
      if (project) {
        await tx.clientProject.create({
          data: {
            clientId: row.id,
            title: project.title,
            serviceType: project.serviceType,
            description: project.description,
            priceKobo: bigOrNull(project.price),
            status: project.status,
            startDate: dayToDate(project.startDate),
            expectedDeliveryDate: dayToDate(project.expectedDeliveryDate),
            completedDate: dayToDate(project.completedDate) ?? (project.status === "COMPLETED" ? dayToDate(lagosToday()) : null),
            maintenanceFeeKobo: bigOrNull(project.maintenanceFee),
            maintenanceInterval: project.maintenanceInterval,
            nextPaymentDate: dayToDate(project.nextPaymentDate),
          },
        });
      }
      return row;
    });
    await auditLog(session.email, "business.client.create", created.id, auditSnapshot({ ...client, project: project ?? null }) as never);
    return NextResponse.json({ id: created.id }, { status: 201 });
  });
}
