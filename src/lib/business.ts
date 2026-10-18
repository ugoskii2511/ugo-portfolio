import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  countsTowardTotals,
  dateFilter,
  dayString,
  lastMonths,
  projectFinancials,
  type DateRange,
  type PaymentStatus,
  type ProjectFinancials,
  type ProjectStatus,
} from "@/lib/business-calc";
import { toKoboNumber } from "@/lib/money";

/// Server-side reads for the business records. Every figure is computed from
/// the underlying payment / expense rows; nothing is read from a stored
/// total. "Live" means not deleted: a deleted client hides its projects and
/// payments from every total until it's restored.

export const livePaymentWhere: Prisma.ClientPaymentWhereInput = {
  deletedAt: null,
  client: { deletedAt: null },
  OR: [{ projectId: null }, { project: { deletedAt: null } }],
};

/// Expenses are money that left the business, so they stay in totals even if
/// the client/project they were linked to is later deleted.
export const liveExpenseWhere: Prisma.ExpenseWhereInput = { deletedAt: null };

export const liveProjectWhere: Prisma.ClientProjectWhereInput = { deletedAt: null, client: { deletedAt: null } };

export type ProjectRow = {
  id: string;
  title: string;
  serviceType: string | null;
  description: string | null;
  status: ProjectStatus;
  priceKobo: number | null;
  maintenanceFeeKobo: number | null;
  maintenanceInterval: string | null;
  nextPaymentDate: string | null;
  startDate: string | null;
  expectedDeliveryDate: string | null;
  completedDate: string | null;
  createdAt: string;
  deleted: boolean;
  client: { id: string; name: string; businessName: string | null; phone: string | null; email: string | null; whatsapp: string | null };
  paidKobo: number;
  maintenanceKobo: number;
  directExpensesKobo: number;
} & ProjectFinancials;

type ProjectWithClient = Prisma.ClientProjectGetPayload<{
  include: { client: { select: { id: true; name: true; businessName: true; phone: true; email: true; whatsapp: true } } };
}>;

/// Attach payment and expense sums (computed in the database) to projects.
export async function withFinancials(projects: ProjectWithClient[]): Promise<ProjectRow[]> {
  if (projects.length === 0) return [];
  const ids = projects.map((p) => p.id);
  const [paymentSums, expenseSums] = await Promise.all([
    prisma.clientPayment.groupBy({
      by: ["projectId", "kind"],
      where: { deletedAt: null, projectId: { in: ids } },
      _sum: { amountKobo: true },
    }),
    prisma.expense.groupBy({
      by: ["projectId"],
      where: { ...liveExpenseWhere, projectId: { in: ids } },
      _sum: { amountKobo: true },
    }),
  ]);
  const paid = new Map<string, number>();
  const maintenance = new Map<string, number>();
  for (const row of paymentSums) {
    if (!row.projectId) continue;
    (row.kind === "MAINTENANCE" ? maintenance : paid).set(row.projectId, toKoboNumber(row._sum.amountKobo));
  }
  const expenses = new Map(expenseSums.map((r) => [r.projectId!, toKoboNumber(r._sum.amountKobo)]));

  return projects.map((p) => {
    const figures = {
      priceKobo: p.priceKobo === null ? null : toKoboNumber(p.priceKobo),
      paidKobo: paid.get(p.id) ?? 0,
      maintenanceKobo: maintenance.get(p.id) ?? 0,
      directExpensesKobo: expenses.get(p.id) ?? 0,
      status: p.status as ProjectStatus,
    };
    return {
      id: p.id,
      title: p.title,
      serviceType: p.serviceType,
      description: p.description,
      status: figures.status,
      priceKobo: figures.priceKobo,
      maintenanceFeeKobo: p.maintenanceFeeKobo === null ? null : toKoboNumber(p.maintenanceFeeKobo),
      maintenanceInterval: p.maintenanceInterval,
      nextPaymentDate: dayString(p.nextPaymentDate),
      startDate: dayString(p.startDate),
      expectedDeliveryDate: dayString(p.expectedDeliveryDate),
      completedDate: dayString(p.completedDate),
      createdAt: p.createdAt.toISOString(),
      deleted: p.deletedAt !== null,
      client: p.client,
      paidKobo: figures.paidKobo,
      maintenanceKobo: figures.maintenanceKobo,
      directExpensesKobo: figures.directExpensesKobo,
      ...projectFinancials(figures),
    };
  });
}

export const clientSelect = { id: true, name: true, businessName: true, phone: true, email: true, whatsapp: true } as const;

export async function loadProjects(where: Prisma.ClientProjectWhereInput = liveProjectWhere): Promise<ProjectRow[]> {
  const projects = await prisma.clientProject.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { client: { select: clientSelect } },
  });
  return withFinancials(projects);
}

export type ClientRow = {
  id: string;
  name: string;
  businessName: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  createdAt: string;
  deleted: boolean;
  projectCount: number;
  serviceTypes: string[];
  /// Agreed value of non-cancelled projects.
  valueKobo: number;
  paidKobo: number;
  outstandingKobo: number;
  /// Most relevant project status (active work first).
  status: ProjectStatus | null;
  paymentStatus: PaymentStatus | null;
};

const STATUS_PRIORITY: ProjectStatus[] = ["IN_PROGRESS", "ON_HOLD", "QUOTED", "INQUIRY", "COMPLETED", "CANCELLED"];

export function summariseClient(
  client: { id: string; name: string; businessName: string | null; phone: string | null; email: string | null; whatsapp: string | null; createdAt: Date; deletedAt: Date | null },
  projects: ProjectRow[]
): ClientRow {
  const counted = projects.filter((p) => countsTowardTotals(p.status));
  const valueKobo = counted.reduce((s, p) => s + (p.priceKobo ?? 0), 0);
  const paidKobo = projects.reduce((s, p) => s + p.paidKobo, 0);
  const outstanding = counted.reduce((s, p) => s + p.outstandingKobo, 0);
  const status = STATUS_PRIORITY.find((st) => projects.some((p) => p.status === st)) ?? null;
  let paymentStatusValue: PaymentStatus | null = null;
  if (counted.length) {
    if (outstanding === 0 && paidKobo > 0) paymentStatusValue = "PAID";
    else if (paidKobo > 0) paymentStatusValue = "PARTIAL";
    else paymentStatusValue = valueKobo > 0 ? "UNPAID" : null;
  }
  return {
    id: client.id,
    name: client.name,
    businessName: client.businessName,
    phone: client.phone,
    email: client.email,
    whatsapp: client.whatsapp,
    createdAt: client.createdAt.toISOString(),
    deleted: client.deletedAt !== null,
    projectCount: projects.length,
    serviceTypes: [...new Set(projects.map((p) => p.serviceType).filter((s): s is string => !!s))],
    valueKobo,
    paidKobo,
    outstandingKobo: outstanding,
    status,
    paymentStatus: paymentStatusValue,
  };
}

export async function loadClients({ deleted = false }: { deleted?: boolean } = {}): Promise<ClientRow[]> {
  const clients = await prisma.client.findMany({
    where: { deletedAt: deleted ? { not: null } : null },
    orderBy: { createdAt: "desc" },
  });
  if (clients.length === 0) return [];
  const projects = await loadProjects({ clientId: { in: clients.map((c) => c.id) }, deletedAt: null });
  const byClient = new Map<string, ProjectRow[]>();
  for (const p of projects) byClient.set(p.client.id, [...(byClient.get(p.client.id) ?? []), p]);
  return clients.map((c) => summariseClient(c, byClient.get(c.id) ?? []));
}

async function sumPayments(where: Prisma.ClientPaymentWhereInput): Promise<number> {
  const r = await prisma.clientPayment.aggregate({ where: { ...livePaymentWhere, ...where }, _sum: { amountKobo: true } });
  return toKoboNumber(r._sum.amountKobo);
}

async function sumExpenses(where: Prisma.ExpenseWhereInput): Promise<number> {
  const r = await prisma.expense.aggregate({ where: { ...liveExpenseWhere, ...where }, _sum: { amountKobo: true } });
  return toKoboNumber(r._sum.amountKobo);
}

export async function receivedIn(range: Pick<DateRange, "from" | "to">, extra: Prisma.ClientPaymentWhereInput = {}) {
  const filter = dateFilter(range);
  return sumPayments({ ...(filter ? { paidOn: filter } : {}), ...extra });
}

export async function spentIn(range: Pick<DateRange, "from" | "to">, extra: Prisma.ExpenseWhereInput = {}) {
  const filter = dateFilter(range);
  return sumExpenses({ ...(filter ? { spentOn: filter } : {}), ...extra });
}

export type Overview = {
  totalClients: number;
  totalProjectValueKobo: number;
  outstandingKobo: number;
  activeProjects: number;
  completedProjects: number;
  unpaidClients: number;
  receivedKobo: number;
  expensesKobo: number;
  netCashFlowKobo: number;
  monthRevenueKobo: number;
  newClients: number;
};

export async function loadOverview(range: DateRange, month: DateRange, createdFilter: { gte?: Date; lt?: Date } | undefined): Promise<Overview> {
  const [clients, projects, receivedKobo, expensesKobo, monthRevenueKobo, newClients] = await Promise.all([
    loadClients(),
    loadProjects(),
    receivedIn(range),
    spentIn(range),
    receivedIn(month),
    prisma.client.count({ where: { deletedAt: null, ...(createdFilter ? { createdAt: createdFilter } : {}) } }),
  ]);
  const counted = projects.filter((p) => countsTowardTotals(p.status));
  return {
    totalClients: clients.length,
    totalProjectValueKobo: counted.reduce((s, p) => s + (p.priceKobo ?? 0), 0),
    outstandingKobo: counted.reduce((s, p) => s + p.outstandingKobo, 0),
    activeProjects: projects.filter((p) => p.status === "IN_PROGRESS").length,
    completedProjects: projects.filter((p) => p.status === "COMPLETED").length,
    unpaidClients: clients.filter((c) => c.outstandingKobo > 0).length,
    receivedKobo,
    expensesKobo,
    netCashFlowKobo: receivedKobo - expensesKobo,
    monthRevenueKobo,
    newClients,
  };
}

export type MonthPoint = { month: string; receivedKobo: number; expensesKobo: number };

/// Received vs spent per calendar month (oldest first), from the rows.
export async function monthlySeries(months: number): Promise<MonthPoint[]> {
  const keys = lastMonths(months);
  const since = new Date(`${keys[0]}-01T00:00:00Z`);
  const [payments, expenses] = await Promise.all([
    prisma.clientPayment.findMany({ where: { ...livePaymentWhere, paidOn: { gte: since } }, select: { paidOn: true, amountKobo: true } }),
    prisma.expense.findMany({ where: { ...liveExpenseWhere, spentOn: { gte: since } }, select: { spentOn: true, amountKobo: true } }),
  ]);
  const series = new Map(keys.map((k) => [k, { month: k, receivedKobo: 0, expensesKobo: 0 }]));
  for (const p of payments) {
    const point = series.get(p.paidOn.toISOString().slice(0, 7));
    if (point) point.receivedKobo += toKoboNumber(p.amountKobo);
  }
  for (const e of expenses) {
    const point = series.get(e.spentOn.toISOString().slice(0, 7));
    if (point) point.expensesKobo += toKoboNumber(e.amountKobo);
  }
  return [...series.values()];
}

export type PaymentView = {
  id: string;
  amountKobo: number;
  paidOn: string;
  method: string;
  reference: string | null;
  kind: "PROJECT" | "MAINTENANCE";
  deleted: boolean;
  createdAt: string;
  client: { id: string; name: string };
  project: { id: string; title: string } | null;
};

export function toPaymentView(p: Prisma.ClientPaymentGetPayload<{ include: { client: { select: { id: true; name: true } }; project: { select: { id: true; title: true } } } }>): PaymentView {
  return {
    id: p.id,
    amountKobo: toKoboNumber(p.amountKobo),
    paidOn: dayString(p.paidOn)!,
    method: p.method,
    reference: p.reference,
    kind: p.kind,
    deleted: p.deletedAt !== null,
    createdAt: p.createdAt.toISOString(),
    client: p.client,
    project: p.project,
  };
}

export type ExpenseView = {
  id: string;
  name: string;
  amountKobo: number;
  category: string;
  spentOn: string;
  notes: string | null;
  method: string | null;
  hasReceipt: boolean;
  deleted: boolean;
  client: { id: string; name: string } | null;
  project: { id: string; title: string } | null;
};

export function toExpenseView(e: Prisma.ExpenseGetPayload<{ include: { client: { select: { id: true; name: true } }; project: { select: { id: true; title: true } } } }>): ExpenseView {
  return {
    id: e.id,
    name: e.name,
    amountKobo: toKoboNumber(e.amountKobo),
    category: e.category,
    spentOn: dayString(e.spentOn)!,
    notes: e.notes,
    method: e.method,
    hasReceipt: !!e.receiptPath,
    deleted: e.deletedAt !== null,
    client: e.client,
    project: e.project,
  };
}

/// Options for "which client / project is this for" pickers.
export async function clientProjectOptions() {
  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, businessName: true, projects: { where: { deletedAt: null }, select: { id: true, title: true, status: true }, orderBy: { createdAt: "desc" } } },
  });
  return clients.map((c) => ({ id: c.id, name: c.businessName ? `${c.name} (${c.businessName})` : c.name, projects: c.projects }));
}
export type ClientOption = Awaited<ReturnType<typeof clientProjectOptions>>[number];
