import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { agreedTotalKobo, dayString, lagosToday, paymentStatus } from "@/lib/business-calc";
import { BusinessError, dayToDate } from "@/lib/business-api";
import { toKoboNumber } from "@/lib/money";
import { SITE_URL } from "@/lib/site";
import {
  DEFAULT_ACKNOWLEDGEMENT,
  RECEIPT_PAYMENT_STATUS_LABEL,
  defaultPaymentDescription,
  formatReceiptNumber,
  ledgerAt,
  methodLabel,
  type ReceiptSnapshot,
} from "@/lib/receipt-calc";

/// The interactive-transaction client of our (extended) Prisma client.
type Tx = Parameters<Extract<Parameters<typeof prisma.$transaction>[0], (...args: never[]) => unknown>>[0];

export type ResolvedReceiptSettings = {
  businessName: string;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  currency: string;
  currencySymbol: string;
  numberPrefix: string;
  authorizedName: string | null;
  authorizedTitle: string | null;
  acknowledgement: string;
  footerNote: string | null;
};

/// Receipt settings, falling back to the site's own details (name, contact
/// email, WhatsApp number, address of the live site) for anything not set.
export async function getReceiptSettings(db: Tx | typeof prisma = prisma): Promise<ResolvedReceiptSettings> {
  const [own, site] = await Promise.all([
    db.receiptSettings.findUnique({ where: { id: "singleton" } }),
    db.siteSettings.findUnique({ where: { id: "singleton" }, select: { siteName: true, contactEmail: true, whatsappNumber: true } }),
  ]);
  const phone = site?.whatsappNumber ? `+${site.whatsappNumber.replace(/\D/g, "")}` : null;
  return {
    businessName: own?.businessName || site?.siteName || "My business",
    logoUrl: own?.logoUrl || "/logo.jpg",
    email: own?.email || site?.contactEmail || null,
    phone: own?.phone || phone,
    website: own?.website || (SITE_URL.includes("localhost") ? null : SITE_URL.replace(/^https?:\/\//, "")),
    address: own?.address || null,
    currency: own?.currency || "NGN",
    currencySymbol: own?.currencySymbol || "₦",
    numberPrefix: own?.numberPrefix || "RCT",
    authorizedName: own?.authorizedName || site?.siteName || null,
    authorizedTitle: own?.authorizedTitle || null,
    acknowledgement: own?.acknowledgement || DEFAULT_ACKNOWLEDGEMENT,
    footerNote: own?.footerNote || null,
  };
}

/// Next number for the year. One atomic upsert, so two receipts issued at
/// the same moment can never share a number, and a number is never reused
/// (voided receipts keep theirs).
async function nextReceiptNumber(tx: Tx, prefix: string, year: number): Promise<string> {
  const rows = await tx.$queryRaw<{ last: number }[]>`
    INSERT INTO "ReceiptCounter" ("year", "last") VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE SET "last" = "ReceiptCounter"."last" + 1
    RETURNING "last"`;
  return formatReceiptNumber(prefix, year, Number(rows[0].last));
}

/// Placeholder shown in previews: the real number is assigned on issue.
export const PREVIEW_NUMBER = "Assigned when issued";

/// Builds the receipt snapshot for a payment from the current records.
export async function buildSnapshot(tx: Tx, paymentId: string, issueDay: string, number: string, settings: ResolvedReceiptSettings): Promise<ReceiptSnapshot> {
  const payment = await tx.clientPayment.findUnique({
    where: { id: paymentId },
    include: { client: true, project: true },
  });
  if (!payment || payment.deletedAt || payment.client.deletedAt) throw new BusinessError("That payment wasn't found.", 404);
  if (payment.project?.deletedAt) throw new BusinessError("That payment's project has been deleted. Restore it first.");
  if (payment.status !== "CONFIRMED") throw new BusinessError(`This payment is marked ${payment.status.toLowerCase()}. Only confirmed payments get receipts.`);

  const project = payment.project;
  const isMaintenance = payment.kind === "MAINTENANCE";
  const totalKobo = project && !isMaintenance ? agreedTotalKobo(project.priceKobo === null ? null : toKoboNumber(project.priceKobo), project.additionalChargesKobo === null ? null : toKoboNumber(project.additionalChargesKobo), project.discountKobo === null ? null : toKoboNumber(project.discountKobo)) : null;

  // The project's payments of the same kind (or this one alone if it has no project).
  const siblings = project
    ? await tx.clientPayment.findMany({ where: { projectId: project.id, kind: payment.kind, deletedAt: null }, select: { id: true, amountKobo: true, paidOn: true, createdAt: true, status: true, description: true } })
    : [payment];
  const ledger = ledgerAt(
    totalKobo,
    siblings.map((p) => ({ id: p.id, amountKobo: toKoboNumber(p.amountKobo), paidOn: dayString(p.paidOn)!, createdAt: p.createdAt.toISOString(), status: p.status, description: p.description })),
    payment.id
  );

  // Undescribed payments get the same automatic label they'd have had on their own receipt.
  const thisDescription = payment.description || (isMaintenance ? "Hosting / maintenance" : defaultPaymentDescription(ledger.installmentNumber, ledger.status, totalKobo !== null));
  let running = 0;
  const installments = ledger.installments.map((p, i) => {
    running += p.amountKobo;
    const label = p.isThis ? thisDescription : p.description || (isMaintenance ? "Hosting / maintenance" : defaultPaymentDescription(i + 1, paymentStatus(totalKobo, running), totalKobo !== null));
    return { ...p, description: label };
  });

  return {
    version: 1,
    number,
    issueDate: issueDay,
    paymentDate: dayString(payment.paidOn)!,
    currency: settings.currency,
    currencySymbol: settings.currencySymbol,
    business: { name: settings.businessName, logoUrl: settings.logoUrl, email: settings.email, phone: settings.phone, website: settings.website, address: settings.address },
    client: { name: payment.client.name, businessName: payment.client.businessName, email: payment.client.email, phone: payment.client.phone ?? payment.client.whatsapp },
    project: project
      ? {
          title: project.title,
          description: project.description,
          category: project.serviceType,
          reference: project.referenceNumber,
          basePriceKobo: project.priceKobo === null ? null : toKoboNumber(project.priceKobo),
          additionalChargesKobo: project.additionalChargesKobo === null ? null : toKoboNumber(project.additionalChargesKobo),
          discountKobo: project.discountKobo === null ? null : toKoboNumber(project.discountKobo),
          totalKobo,
        }
      : null,
    payment: {
      amountKobo: ledger.thisPaymentKobo,
      description: thisDescription,
      method: payment.method,
      methodLabel: methodLabel(payment.method),
      reference: payment.reference,
      kind: payment.kind,
    },
    totals: {
      paidBeforeKobo: ledger.paidBeforeKobo,
      paidToDateKobo: ledger.paidToDateKobo,
      outstandingKobo: ledger.outstandingKobo,
      creditKobo: ledger.creditKobo,
      percent: ledger.percent,
      status: ledger.status,
      statusLabel: isMaintenance ? "Paid" : totalKobo === null ? "Price not set" : RECEIPT_PAYMENT_STATUS_LABEL[ledger.status],
    },
    installments,
    acknowledgement: settings.acknowledgement,
    authorizedName: settings.authorizedName,
    authorizedTitle: settings.authorizedTitle,
    footerNote: settings.footerNote,
  };
}

/// Issues a receipt for a confirmed payment. A payment has at most one
/// issued receipt at a time (also enforced by a partial unique index).
export async function issueReceipt(tx: Tx, paymentId: string, actor: string, issueDay: string = lagosToday()) {
  const existing = await tx.receipt.findFirst({ where: { paymentId, status: "ISSUED" }, select: { id: true, number: true } });
  if (existing) throw new BusinessError(`This payment already has receipt ${existing.number}.`, 409, { receiptId: existing.id, existingReceipt: true });
  const settings = await getReceiptSettings(tx);
  const payment = await tx.clientPayment.findUnique({ where: { id: paymentId }, select: { clientId: true, projectId: true } });
  if (!payment) throw new BusinessError("That payment wasn't found.", 404);
  // Build first (validates the payment) so a rejected receipt doesn't use up a number.
  const draft = await buildSnapshot(tx, paymentId, issueDay, "", settings);
  const number = await nextReceiptNumber(tx, settings.numberPrefix, Number(issueDay.slice(0, 4)));
  const data: ReceiptSnapshot = { ...draft, number };
  return tx.receipt.create({
    data: {
      number,
      paymentId,
      clientId: payment.clientId,
      projectId: payment.projectId,
      issueDate: dayToDate(issueDay)!,
      currency: settings.currency,
      data: data as unknown as Prisma.InputJsonValue,
      createdBy: actor,
    },
  });
}

/// Voids every issued receipt for a payment (after it's edited, deleted,
/// refunded…). The receipts stay on record, marked void, with the reason.
export async function voidReceiptsForPayment(tx: Tx, paymentId: string, reason: string, actor: string): Promise<string[]> {
  const issued = await tx.receipt.findMany({ where: { paymentId, status: "ISSUED" }, select: { id: true, number: true } });
  if (issued.length === 0) return [];
  await tx.receipt.updateMany({
    where: { id: { in: issued.map((r) => r.id) } },
    data: { status: "VOIDED", voidReason: reason.slice(0, 500), voidedAt: new Date(), voidedBy: actor },
  });
  await tx.adminAuditLog.createMany({
    data: issued.map((r) => ({ actor, action: "receipt.void", target: r.id, details: { number: r.number, reason } })),
  });
  return issued.map((r) => r.number);
}

export function snapshotOf(receipt: { data: Prisma.JsonValue }): ReceiptSnapshot {
  return receipt.data as unknown as ReceiptSnapshot;
}
