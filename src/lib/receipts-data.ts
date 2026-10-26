import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { countsTowardTotals, dayString, type PaymentStatus } from "@/lib/business-calc";
import { livePaymentRecordWhere, loadProjects, type ProjectRow } from "@/lib/business";
import { snapshotOf } from "@/lib/receipts";
import { methodLabel, type PaymentRecordStatus } from "@/lib/receipt-calc";
import { toKoboNumber } from "@/lib/money";

/// Read models for the Receipts & Payments pages.

export type ReceiptRow = {
  id: string;
  number: string;
  status: "ISSUED" | "VOIDED";
  issueDate: string;
  createdAt: string;
  clientId: string;
  clientName: string;
  projectId: string | null;
  projectTitle: string | null;
  amountKobo: number;
  currencySymbol: string;
  paymentDate: string;
  method: string;
  methodLabel: string;
  paymentDescription: string;
  paymentStatus: PaymentStatus;
  statusLabel: string;
  paidToDateKobo: number;
  outstandingKobo: number;
  voidReason: string | null;
};

export async function loadReceiptRows(where: Prisma.ReceiptWhereInput = {}, take = 2000): Promise<ReceiptRow[]> {
  const rows = await prisma.receipt.findMany({ where, orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }], take });
  return rows.map((r) => {
    const s = snapshotOf(r);
    return {
      id: r.id,
      number: r.number,
      status: r.status,
      issueDate: dayString(r.issueDate)!,
      createdAt: r.createdAt.toISOString(),
      clientId: r.clientId,
      clientName: s.client.name,
      projectId: r.projectId,
      projectTitle: s.project?.title ?? null,
      amountKobo: s.payment.amountKobo,
      currencySymbol: s.currencySymbol,
      paymentDate: s.paymentDate,
      method: s.payment.method,
      methodLabel: s.payment.methodLabel,
      paymentDescription: s.payment.description,
      paymentStatus: s.totals.status,
      statusLabel: s.totals.statusLabel,
      paidToDateKobo: s.totals.paidToDateKobo,
      outstandingKobo: s.totals.outstandingKobo,
      voidReason: r.voidReason,
    };
  });
}

export type PaymentRecordRow = {
  id: string;
  amountKobo: number;
  paidOn: string;
  createdAt: string;
  method: string;
  reference: string | null;
  description: string | null;
  notes: string | null;
  status: PaymentRecordStatus;
  statusReason: string | null;
  kind: "PROJECT" | "MAINTENANCE";
  client: { id: string; name: string };
  project: { id: string; title: string } | null;
  receipt: { id: string; number: string } | null;
  voidedReceipts: number;
};

export async function loadPaymentRecords(where: Prisma.ClientPaymentWhereInput = {}, take?: number): Promise<PaymentRecordRow[]> {
  const rows = await prisma.clientPayment.findMany({
    where: { ...livePaymentRecordWhere, ...where },
    orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
    take,
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
      receipts: { select: { id: true, number: true, status: true }, orderBy: { createdAt: "desc" } },
    },
  });
  return rows.map((p) => {
    const issued = p.receipts.find((r) => r.status === "ISSUED");
    return {
      id: p.id,
      amountKobo: toKoboNumber(p.amountKobo),
      paidOn: dayString(p.paidOn)!,
      createdAt: p.createdAt.toISOString(),
      method: p.method,
      reference: p.reference,
      description: p.description,
      notes: p.notes,
      status: p.status,
      statusReason: p.statusReason,
      kind: p.kind,
      client: p.client,
      project: p.project,
      receipt: issued ? { id: issued.id, number: issued.number } : null,
      voidedReceipts: p.receipts.filter((r) => r.status === "VOIDED").length,
    };
  });
}

export type ReceiptOverview = {
  totalReceivedKobo: number;
  outstandingKobo: number;
  clients: number;
  receiptsIssued: number;
  receiptsVoided: number;
  fullyPaidProjects: number;
  partiallyPaidProjects: number;
  unpaidProjects: number;
  paymentsWithoutReceipt: number;
};

export async function loadReceiptOverview(projects?: ProjectRow[]): Promise<ReceiptOverview> {
  const [rows, received, clients, issued, voided, withoutReceipt] = await Promise.all([
    projects ? Promise.resolve(projects) : loadProjects(),
    prisma.clientPayment.aggregate({ where: { ...livePaymentRecordWhere, status: "CONFIRMED" }, _sum: { amountKobo: true } }),
    prisma.client.count({ where: { deletedAt: null } }),
    prisma.receipt.count({ where: { status: "ISSUED" } }),
    prisma.receipt.count({ where: { status: "VOIDED" } }),
    prisma.clientPayment.count({ where: { ...livePaymentRecordWhere, status: "CONFIRMED", receipts: { none: { status: "ISSUED" } } } }),
  ]);
  const counted = rows.filter((p) => countsTowardTotals(p.status) && p.priceKobo !== null && p.priceKobo > 0);
  return {
    totalReceivedKobo: toKoboNumber(received._sum.amountKobo),
    outstandingKobo: counted.reduce((s, p) => s + p.outstandingKobo, 0),
    clients,
    receiptsIssued: issued,
    receiptsVoided: voided,
    fullyPaidProjects: counted.filter((p) => p.paymentStatus === "PAID" || p.paymentStatus === "OVERPAID").length,
    partiallyPaidProjects: counted.filter((p) => p.paymentStatus === "PARTIAL").length,
    unpaidProjects: counted.filter((p) => p.paymentStatus === "UNPAID").length,
    paymentsWithoutReceipt: withoutReceipt,
  };
}

/// Clients and their projects with live balances, for the receipt form.
export type ReceiptFormClient = {
  id: string;
  name: string;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  projects: {
    id: string;
    title: string;
    serviceType: string | null;
    status: string;
    totalKobo: number | null;
    paidKobo: number;
    outstandingKobo: number;
    paymentStatus: PaymentStatus;
    payments: number;
    /// Confirmed payments already on record, newest first.
    recorded: { id: string; amountKobo: number; paidOn: string; description: string | null; methodLabel: string; kind: "PROJECT" | "MAINTENANCE"; receipt: { id: string; number: string } | null }[];
  }[];
};

export async function receiptFormClients(): Promise<ReceiptFormClient[]> {
  const [clients, projects, counts, recorded] = await Promise.all([
    prisma.client.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, businessName: true, email: true, phone: true, whatsapp: true } }),
    loadProjects(),
    prisma.clientPayment.groupBy({ by: ["projectId"], where: { ...livePaymentRecordWhere, status: "CONFIRMED", kind: "PROJECT" }, _count: { _all: true } }),
    loadPaymentRecords({ status: "CONFIRMED", projectId: { not: null } }),
  ]);
  const byProject = new Map<string, ReceiptFormClient["projects"][number]["recorded"]>();
  for (const p of recorded) {
    const list = byProject.get(p.project!.id) ?? [];
    list.push({ id: p.id, amountKobo: p.amountKobo, paidOn: p.paidOn, description: p.description, methodLabel: methodLabel(p.method), kind: p.kind, receipt: p.receipt });
    byProject.set(p.project!.id, list);
  }
  const paymentCount = new Map(counts.map((c) => [c.projectId, c._count._all]));
  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    businessName: c.businessName,
    email: c.email,
    phone: c.phone ?? c.whatsapp,
    projects: projects
      .filter((p) => p.client.id === c.id)
      .map((p) => ({
        id: p.id,
        title: p.title,
        serviceType: p.serviceType,
        status: p.status,
        totalKobo: p.priceKobo,
        paidKobo: p.paidKobo,
        outstandingKobo: p.outstandingKobo,
        paymentStatus: p.paymentStatus,
        payments: paymentCount.get(p.id) ?? 0,
        recorded: byProject.get(p.id) ?? [],
      })),
  }));
}
