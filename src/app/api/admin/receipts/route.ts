import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { createReceiptSchema } from "@/lib/business-schemas";
import { adminRoute, bigOrNull, BusinessError, dayToDate } from "@/lib/business-api";
import { lagosToday } from "@/lib/business-calc";
import { auditLog } from "@/lib/crm";
import { formatKobo } from "@/lib/money";
import { buildSnapshot, getReceiptSettings, issueReceipt, PREVIEW_NUMBER } from "@/lib/receipts";
import type { ReceiptSnapshot } from "@/lib/receipt-calc";

/// Thrown at the end of a preview so the whole transaction (client, project,
/// payment, receipt number) is rolled back: the preview runs exactly the same
/// checks and calculations as the real thing, but saves nothing.
class PreviewOnly extends Error {
  constructor(readonly snapshot: ReceiptSnapshot) {
    super("preview");
  }
}

const TX = { timeout: 30_000, maxWait: 10_000 };

/// Generate a receipt. Either for a payment that's already recorded
/// (paymentId), or record a new payment — creating the client / project
/// if they're new — and issue its receipt, all in one transaction.
export function POST(request: NextRequest) {
  return adminRoute(request, async (session) => {
    const input = createReceiptSchema.parse(await request.json());
    const today = lagosToday();
    if (input.issueDate > today) throw new BusinessError("The issue date can't be in the future.");
    if (input.payment && input.payment.paidOn > today) throw new BusinessError("The payment date can't be in the future.");

    // A retried submit (double-click, flaky network) returns the first result.
    if (!input.preview) {
      const earlier = await prisma.clientPayment.findUnique({
        where: { clientRequestId: input.clientRequestId },
        select: { receipts: { where: { status: "ISSUED" }, select: { id: true, number: true } } },
      });
      if (earlier?.receipts[0]) return NextResponse.json({ id: earlier.receipts[0].id, number: earlier.receipts[0].number, alreadyIssued: true });
    }

    try {
      const receipt = await prisma.$transaction(async (tx) => {
        let paymentId = input.paymentId;
        const created: string[] = [];

        if (!paymentId) {
          // ---- client
          let clientId = input.clientId;
          if (clientId) {
            const client = await tx.client.findUnique({ where: { id: clientId }, select: { deletedAt: true } });
            if (!client || client.deletedAt) throw new BusinessError("That client wasn't found.", 404);
          } else {
            const c = input.newClient!;
            if (!input.confirmDuplicate) {
              const twin = await tx.client.findFirst({
                where: { deletedAt: null, OR: [{ name: { equals: c.name, mode: "insensitive" } }, ...(c.email ? [{ email: { equals: c.email, mode: "insensitive" as const } }] : [])] },
                select: { name: true },
              });
              if (twin) {
                throw new BusinessError(`You already have a client called “${twin.name}” (or with this email). Pick them from the client list, or confirm this is a different person.`, 409, { duplicate: true });
              }
            }
            const client = await tx.client.create({ data: { name: c.name, businessName: c.businessName, phone: c.phone, email: c.email, whatsapp: c.whatsapp, notes: c.notes } });
            clientId = client.id;
            created.push(`client ${client.id}`);
          }

          // ---- project
          let projectId = input.projectId;
          if (projectId) {
            const project = await tx.clientProject.findUnique({ where: { id: projectId }, select: { clientId: true, deletedAt: true } });
            if (!project || project.deletedAt || project.clientId !== clientId) throw new BusinessError("That project wasn't found for this client.", 404);
          } else {
            const p = input.newProject!;
            const project = await tx.clientProject.create({
              data: {
                clientId,
                title: p.title,
                serviceType: p.serviceType,
                description: p.description,
                priceKobo: bigOrNull(p.price),
                additionalChargesKobo: bigOrNull(p.additionalCharges),
                discountKobo: bigOrNull(p.discount),
                referenceNumber: p.referenceNumber,
                status: p.status,
                startDate: dayToDate(p.startDate),
                expectedDeliveryDate: dayToDate(p.expectedDeliveryDate),
                completedDate: dayToDate(p.completedDate),
              },
            });
            projectId = project.id;
            created.push(`project ${project.id}`);
          }

          // ---- payment
          const pay = input.payment!;
          if (!input.confirmDuplicate) {
            const twin = await tx.clientPayment.findFirst({
              where: { projectId, kind: pay.kind, amountKobo: BigInt(pay.amount), paidOn: dayToDate(pay.paidOn)!, status: "CONFIRMED", deletedAt: null },
              select: { receipts: { where: { status: "ISSUED" }, select: { number: true } } },
            });
            if (twin) {
              const has = twin.receipts[0] ? ` (receipt ${twin.receipts[0].number})` : "";
              throw new BusinessError(
                `A ${formatKobo(pay.amount)} payment on ${pay.paidOn} is already recorded for this project${has}. Continue only if this is a separate payment.`,
                409,
                { duplicate: true }
              );
            }
          }
          const payment = await tx.clientPayment.create({
            data: {
              clientId: clientId!,
              projectId,
              kind: pay.kind,
              amountKobo: BigInt(pay.amount),
              paidOn: dayToDate(pay.paidOn)!,
              method: pay.method,
              reference: pay.reference,
              description: pay.description,
              notes: pay.notes,
              clientRequestId: input.preview ? null : input.clientRequestId,
            },
          });
          paymentId = payment.id;
          created.push(`payment ${payment.id}`);
        } else {
          const payment = await tx.clientPayment.findUnique({ where: { id: paymentId }, select: { paidOn: true } });
          if (!payment) throw new BusinessError("That payment wasn't found.", 404);
          if (input.issueDate < payment.paidOn.toISOString().slice(0, 10)) throw new BusinessError("The issue date can't be before the payment date.");
        }

        if (input.preview) {
          const existing = await tx.receipt.findFirst({ where: { paymentId, status: "ISSUED" }, select: { number: true } });
          if (existing) throw new BusinessError(`This payment already has receipt ${existing.number}.`, 409);
          throw new PreviewOnly(await buildSnapshot(tx, paymentId, input.issueDate, PREVIEW_NUMBER, await getReceiptSettings(tx)));
        }
        const receipt = await issueReceipt(tx, paymentId, session.email, input.issueDate);
        return { ...receipt, created };
      }, TX);

      await auditLog(session.email, "receipt.issue", receipt.id, { number: receipt.number, paymentId: receipt.paymentId, created: receipt.created });
      return NextResponse.json({ id: receipt.id, number: receipt.number }, { status: 201 });
    } catch (error) {
      if (error instanceof PreviewOnly) return NextResponse.json({ preview: error.snapshot });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Lost a race with an identical submit, or a second receipt for the same payment.
        const earlier = await prisma.clientPayment.findUnique({
          where: { clientRequestId: input.clientRequestId },
          select: { receipts: { where: { status: "ISSUED" }, select: { id: true, number: true } } },
        });
        if (earlier?.receipts[0]) return NextResponse.json({ id: earlier.receipts[0].id, number: earlier.receipts[0].number, alreadyIssued: true });
        throw new BusinessError("This payment already has an issued receipt.", 409);
      }
      throw error;
    }
  });
}
