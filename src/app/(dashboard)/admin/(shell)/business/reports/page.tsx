import type { Metadata } from "next";
import { Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader, Panel, PanelHeader } from "@/components/admin/ui";
import { buttonClass } from "@/components/site/button";
import { Money, ProjectStatusPill, RangeFilter } from "@/components/admin/business/bits";
import { PrintButton } from "@/components/admin/business/print-button";
import { hrefWith } from "@/components/admin/business/list-controls";
import { liveExpenseWhere, livePaymentWhere, loadProjects, liveProjectWhere } from "@/lib/business";
import { countsTowardTotals, dateFilter, EXPENSE_CATEGORIES, lagosToday, monthLabel, resolveRange, timestampFilter } from "@/lib/business-calc";
import { formatKobo, toKoboNumber } from "@/lib/money";

export const metadata: Metadata = { title: "Reports" };

type Search = { range?: string; from?: string; to?: string };

/// Month keys covering a range (capped at 36, newest last).
function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const endKey = to.slice(0, 7);
  while (out.length < 36) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push(key);
    if (key >= endKey) break;
    m += 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
  }
  return out.slice(-36);
}

const lagosMonth = (d: Date) => new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 7);

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const range = resolveRange(params.range ?? "year", params.from, params.to);
  const day = dateFilter(range);
  const created = timestampFilter(range);

  const [payments, expenses, clients, projectsInRange, completed, allProjects, earliest] = await Promise.all([
    prisma.clientPayment.findMany({ where: { ...livePaymentWhere, ...(day ? { paidOn: day } : {}) }, select: { paidOn: true, amountKobo: true, kind: true } }),
    prisma.expense.findMany({ where: { ...liveExpenseWhere, ...(day ? { spentOn: day } : {}) }, select: { spentOn: true, amountKobo: true, category: true, projectId: true } }),
    prisma.client.findMany({ where: { deletedAt: null, ...(created ? { createdAt: created } : {}) }, select: { createdAt: true } }),
    loadProjects({ ...liveProjectWhere, ...(created ? { createdAt: created } : {}) }),
    prisma.clientProject.findMany({ where: { ...liveProjectWhere, status: "COMPLETED", ...(day ? { completedDate: day } : {}) }, select: { completedDate: true } }),
    loadProjects(),
    prisma.clientPayment.findFirst({ where: livePaymentWhere, orderBy: { paidOn: "asc" }, select: { paidOn: true } }),
  ]);

  const received = payments.reduce((s, p) => s + toKoboNumber(p.amountKobo), 0);
  const maintenance = payments.filter((p) => p.kind === "MAINTENANCE").reduce((s, p) => s + toKoboNumber(p.amountKobo), 0);
  const spent = expenses.reduce((s, e) => s + toKoboNumber(e.amountKobo), 0);
  const direct = expenses.filter((e) => e.projectId).reduce((s, e) => s + toKoboNumber(e.amountKobo), 0);
  const newValue = projectsInRange.filter((p) => countsTowardTotals(p.status)).reduce((s, p) => s + (p.priceKobo ?? 0), 0);
  const outstandingNow = allProjects.filter((p) => countsTowardTotals(p.status)).reduce((s, p) => s + p.outstandingKobo, 0);

  // Month-by-month table across the selected range.
  const start = range.from ?? (earliest ? earliest.paidOn.toISOString().slice(0, 10) : lagosToday());
  const months = monthsBetween(start, range.to ?? lagosToday());
  const table = new Map(months.map((k) => [k, { received: 0, spent: 0, clients: 0, completed: 0 }]));
  const bump = (month: string, field: "received" | "spent" | "clients" | "completed", by: number) => {
    const row = table.get(month);
    if (row) row[field] += by;
  };
  for (const p of payments) bump(p.paidOn.toISOString().slice(0, 7), "received", toKoboNumber(p.amountKobo));
  for (const e of expenses) bump(e.spentOn.toISOString().slice(0, 7), "spent", toKoboNumber(e.amountKobo));
  for (const c of clients) bump(lagosMonth(c.createdAt), "clients", 1);
  for (const c of completed) if (c.completedDate) bump(c.completedDate.toISOString().slice(0, 7), "completed", 1);

  const byCategory = Object.entries(expenses.reduce<Record<string, number>>((a, e) => ({ ...a, [e.category]: (a[e.category] ?? 0) + toKoboNumber(e.amountKobo) }), {})).sort((a, b) => b[1] - a[1]);
  const profitability = [...allProjects].sort((a, b) => (b.estimatedProfitKobo ?? -Infinity) - (a.estimatedProfitKobo ?? -Infinity));
  const exportParams = { preset: range.preset, from: range.preset === "custom" ? range.from ?? undefined : undefined, to: range.preset === "custom" ? range.to ?? undefined : undefined };

  const summary: { label: string; value: string; note: string }[] = [
    { label: "Clients acquired", value: String(clients.length), note: "New client records added" },
    { label: "Projects added", value: String(projectsInRange.length), note: `Worth ${formatKobo(newValue)} (excl. cancelled)` },
    { label: "Projects completed", value: String(completed.length), note: "By completion date" },
    { label: "Payments received", value: formatKobo(received), note: maintenance ? `Incl. ${formatKobo(maintenance)} hosting/maintenance` : "Actual money in" },
    { label: "Business expenses", value: formatKobo(spent), note: `${formatKobo(direct)} linked to projects` },
    { label: "Net cash flow", value: formatKobo(received - spent), note: "Received − expenses" },
    { label: "Outstanding now", value: formatKobo(outstandingNow), note: "Owed today, all projects" },
  ];

  return (
    <div className="print-report flex flex-col gap-6">
      <style>{`@media print {
        [data-print-hide] { display: none !important; }
        #admin-main { padding: 0 !important; }
        .print-report, .print-report * { color: #111 !important; background: transparent !important; border-color: #ccc !important; box-shadow: none !important; }
        .print-report table { font-size: 11px; }
        .print-report section, .print-report table { break-inside: avoid; }
      }`}</style>
      <PageHeader
        eyebrow="Business"
        title="Reports"
        description={`Business performance · ${range.label}${range.from ? ` (${range.from} to ${range.to})` : ""}`}
        actions={<PrintButton />}
      />
      <div data-print-hide>
        <RangeFilter preset={range.preset} from={range.from} to={range.to} />
      </div>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((s) => (
          <Panel key={s.label} className="p-4">
            <p className="label-mono !text-[0.6rem]">{s.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight">{s.value}</p>
            <p className="mt-1 text-xs text-muted">{s.note}</p>
          </Panel>
        ))}
      </section>

      <Panel>
        <PanelHeader title="Month by month" description="Money in and out, new clients and completed projects in each month." />
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">Month</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Received</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Expenses</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Net</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">New clients</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...table.entries()].reverse().map(([month, m]) => (
                <tr key={month}>
                  <th scope="row" className="px-5 py-2.5 text-left font-normal">{monthLabel(month)}</th>
                  <td className="px-3 py-2.5 text-right"><Money kobo={m.received} /></td>
                  <td className="px-3 py-2.5 text-right"><Money kobo={m.spent} /></td>
                  <td className="px-3 py-2.5 text-right"><Money kobo={m.received - m.spent} tone="auto" /></td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{m.clients}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{m.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel>
          <PanelHeader title="Expenses by category" />
          {byCategory.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No expenses in this period.</p>
          ) : (
            <ul className="divide-y divide-line">
              {byCategory.map(([cat, kobo]) => (
                <li key={cat} className="flex justify-between gap-3 px-5 py-2.5 text-sm">
                  <span>{EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES] ?? cat}</span>
                  <span className="flex gap-3">
                    <span className="text-xs text-faint">{spent ? Math.round((kobo / spent) * 100) : 0}%</span>
                    <Money kobo={kobo} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Project profitability" description="All current projects. Estimated profit = price − direct expenses; cash after expenses counts only money received." />
          {profitability.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No projects yet.</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-line text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium">Project</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Price</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Received</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Expenses</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Est. profit</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Cash after exp.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {profitability.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-2.5">
                        <p className="font-medium">{p.client.name}</p>
                        <p className="flex items-center gap-2 text-xs text-muted">
                          {p.title} <ProjectStatusPill status={p.status} />
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-right"><Money kobo={p.priceKobo} /></td>
                      <td className="px-3 py-2.5 text-right"><Money kobo={p.paidKobo + p.maintenanceKobo} /></td>
                      <td className="px-3 py-2.5 text-right"><Money kobo={p.directExpensesKobo} /></td>
                      <td className="px-3 py-2.5 text-right"><Money kobo={p.estimatedProfitKobo} tone="auto" /></td>
                      <td className="px-5 py-2.5 text-right"><Money kobo={p.cashAfterExpensesKobo} tone="auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel data-print-hide>
        <PanelHeader title="Export to CSV" description="Opens in Excel or Google Sheets. Uses the date range selected above where it applies." />
        <div className="flex flex-wrap gap-2 p-5">
          {[
            ["clients", "Clients added"],
            ["projects", "Projects + profitability"],
            ["payments", "Payments"],
            ["expenses", "Expenses"],
            ["monthly", "Monthly summary (24 months)"],
          ].map(([type, label]) => (
            <a key={type} href={hrefWith("/api/admin/business/export", { type, ...exportParams }, {})} className={buttonClass("secondary", "sm")}>
              <Download className="h-4 w-4" aria-hidden /> {label}
            </a>
          ))}
        </div>
      </Panel>
    </div>
  );
}
