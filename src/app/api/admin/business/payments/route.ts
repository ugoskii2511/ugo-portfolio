import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { createPaymentSchema } from "@/lib/business-schemas";
import { adminRoute, auditSnapshot, BusinessError, dayToDate } from "@/lib/business-api";
import { auditLog } from "@/lib/crm";
import { formatKobo } from "@/lib/money";

/// Record a payment. Safe against double-submits (clientRequestId is unique)
/// and asks for confirmation before saving an exact duplicate.
export function POST(request: NextRequest) {
  return adminRoute(request, async (session) => {
    const input = createPaymentSchema.parse(await request.json());

    if (input.clientRequestId) {
      const existing = await prisma.clientPayment.findUnique({ where: { clientRequestId: input.clientRequestId }, select: { id: true } });
      if (existing) return NextResponse.json({ id: existing.id, alreadyRecorded: true });
    }

    try {
      const payment = await prisma.$transaction(async (tx) => {
        const project = await tx.clientProject.findUnique({
          where: { id: input.projectId },
          select: { id: true, clientId: true, deletedAt: true, client: { select: { deletedAt: true } } },
        });
        if (!project || project.deletedAt || project.client.deletedAt) throw new BusinessError("That project wasn't found.", 404);

        if (!input.confirmDuplicate) {
          const twin = await tx.clientPayment.findFirst({
            where: { projectId: project.id, kind: input.kind, amountKobo: BigInt(input.amount), paidOn: dayToDate(input.paidOn)!, deletedAt: null },
            select: { id: true },
          });
          if (twin) {
            throw new BusinessError(
              `A ${formatKobo(input.amount)} payment on ${input.paidOn} is already recorded for this project. Save it again only if it's a separate payment.`,
              409,
              { duplicate: true }
            );
          }
        }

        return tx.clientPayment.create({
          data: {
            clientId: project.clientId,
            projectId: project.id,
            kind: input.kind,
            amountKobo: BigInt(input.amount),
            paidOn: dayToDate(input.paidOn)!,
            method: input.method,
            reference: input.reference,
            clientRequestId: input.clientRequestId ?? null,
          },
        });
      });
      await auditLog(session.email, "business.payment.create", payment.id, auditSnapshot(payment) as never);
      return NextResponse.json({ id: payment.id }, { status: 201 });
    } catch (error) {
      // Two identical submits racing: the unique request id lets only one in.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && input.clientRequestId) {
        const existing = await prisma.clientPayment.findUnique({ where: { clientRequestId: input.clientRequestId }, select: { id: true } });
        if (existing) return NextResponse.json({ id: existing.id, alreadyRecorded: true });
      }
      throw error;
    }
  });
}
