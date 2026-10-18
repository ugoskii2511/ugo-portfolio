import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { adminRoute, BusinessError } from "@/lib/business-api";
import { auditLog } from "@/lib/crm";
import {
  csvCell,
  dateFilter,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABEL,
  PROJECT_STATUS_LABEL,
  resolveRange,
  timestampFilter,
} from "@/lib/business-calc";
import { liveExpenseWhere, livePaymentWhere, loadClients, loadProjects, liveProjectWhere, monthlySeries, toExpenseView, toPaymentView } from "@/lib/business";
import { koboToInput } from "@/lib/money";

/// CSV downloads. Amounts are plain naira numbers (e.g. 15000.50) so they
/// sum correctly in a spreadsheet. Every export is recorded in the audit log.
const naira = (kobo: number | null) => (kobo === null ? "" : koboToInput(kobo));

export function GET(request: NextRequest) {
  return adminRoute(request, async (session) => {
    const params = request.nextUrl.searchParams;
    const type = params.get("type") ?? "";
    const range = resolveRange(params.get("preset") ?? "all", params.get("from") ?? undefined, params.get("to") ?? undefined);
    const created = timestampFilter(range);
    let header: string[];
    let rows: unknown[][];

    switch (type) {
      case "clients": {
        const clients = (await loadClients()).filter((c) => !created || inRange(c.createdAt, created));
        header = ["Client", "Business", "Phone", "WhatsApp", "Email", "Projects", "Services", "Project value (NGN)", "Paid (NGN)", "Outstanding (NGN)", "Payment status", "Added"];
        rows = clients.map((c) => [c.name, c.businessName, c.phone, c.whatsapp, c.email, c.projectCount, c.serviceTypes.join("; "), naira(c.valueKobo), naira(c.paidKobo), naira(c.outstandingKobo), c.paymentStatus ? PAYMENT_STATUS_LABEL[c.paymentStatus] : "", c.createdAt.slice(0, 10)]);
        break;
      }
      case "projects": {
        const projects = await loadProjects({ ...liveProjectWhere, ...(created ? { createdAt: created } : {}) });
        header = ["Client", "Project", "Service", "Status", "Price (NGN)", "Paid (NGN)", "Outstanding (NGN)", "Payment status", "Maintenance received (NGN)", "Direct expenses (NGN)", "Estimated profit (NGN)", "Cash after expenses (NGN)", "Start", "Expected delivery", "Completed", "Added"];
        rows = projects.map((p) => [p.client.name, p.title, p.serviceType, PROJECT_STATUS_LABEL[p.status], naira(p.priceKobo), naira(p.paidKobo), naira(p.outstandingKobo), PAYMENT_STATUS_LABEL[p.paymentStatus], naira(p.maintenanceKobo), naira(p.directExpensesKobo), p.estimatedProfitKobo === null ? "" : naira(p.estimatedProfitKobo), naira(p.cashAfterExpensesKobo), p.startDate, p.expectedDeliveryDate, p.completedDate, p.createdAt.slice(0, 10)]);
        break;
      }
      case "payments": {
        const filter = dateFilter(range);
        const payments = await prisma.clientPayment.findMany({
          where: { ...livePaymentWhere, ...(filter ? { paidOn: filter } : {}), ...(params.get("client") ? { clientId: params.get("client")! } : {}) },
          orderBy: { paidOn: "desc" },
          include: { client: { select: { id: true, name: true } }, project: { select: { id: true, title: true } } },
        });
        header = ["Date", "Client", "Project", "Type", "Amount (NGN)", "Method", "Reference"];
        rows = payments.map(toPaymentView).map((p) => [p.paidOn, p.client.name, p.project?.title, p.kind === "MAINTENANCE" ? "Hosting / maintenance" : "Project", naira(p.amountKobo), PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS] ?? p.method, p.reference]);
        break;
      }
      case "expenses": {
        const filter = dateFilter(range);
        const expenses = await prisma.expense.findMany({
          where: { ...liveExpenseWhere, ...(filter ? { spentOn: filter } : {}) },
          orderBy: { spentOn: "desc" },
          include: { client: { select: { id: true, name: true } }, project: { select: { id: true, title: true } } },
        });
        header = ["Date", "Expense", "Category", "Amount (NGN)", "Method", "Client", "Project", "Notes", "Receipt"];
        rows = expenses.map(toExpenseView).map((e) => [e.spentOn, e.name, EXPENSE_CATEGORIES[e.category as keyof typeof EXPENSE_CATEGORIES] ?? e.category, naira(e.amountKobo), e.method ? PAYMENT_METHODS[e.method as keyof typeof PAYMENT_METHODS] : "", e.client?.name, e.project?.title, e.notes, e.hasReceipt ? "yes" : ""]);
        break;
      }
      case "monthly": {
        const series = await monthlySeries(24);
        header = ["Month", "Received (NGN)", "Expenses (NGN)", "Net cash flow (NGN)"];
        rows = series.map((m) => [m.month, naira(m.receivedKobo), naira(m.expensesKobo), naira(m.receivedKobo - m.expensesKobo)]);
        break;
      }
      default:
        throw new BusinessError("Unknown export type", 400);
    }

    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    await auditLog(session.email, "business.export", type, { preset: range.preset, from: range.from, to: range.to, rows: rows.length });
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(`﻿${csv}\r\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-${range.preset}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  });
}

function inRange(iso: string, filter: { gte?: Date; lt?: Date }) {
  const t = new Date(iso).getTime();
  return (!filter.gte || t >= filter.gte.getTime()) && (!filter.lt || t < filter.lt.getTime());
}
