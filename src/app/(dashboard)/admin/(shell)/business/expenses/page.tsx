import type { Metadata } from "next";
import Link from "next/link";
import { Download, Receipt } from "lucide-react";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/admin/ui";
import { buttonClass } from "@/components/site/button";
import { DeleteRestore, MonthChart, Money, RangeFilter } from "@/components/admin/business/bits";
import { QuickActions } from "@/components/admin/business/quick-actions";
import { ExpenseCalculator } from "@/components/admin/business/expense-calculator";
import { EditExpenseButton } from "@/components/admin/business/row-actions";
import { FilterField, FilterForm, hrefWith, paginate, Pagination } from "@/components/admin/business/list-controls";
import { clientProjectOptions, liveExpenseWhere, monthlySeries, spentIn, toExpenseView } from "@/lib/business";
import { dateFilter, EXPENSE_CATEGORIES, monthLabel, PAYMENT_METHODS, resolveRange } from "@/lib/business-calc";
import { formatKobo, toKoboNumber } from "@/lib/money";

export const metadata: Metadata = { title: "Expenses" };

type Search = { range?: string; from?: string; to?: string; q?: string; category?: string; link?: string; deleted?: string; page?: string };
const PAGE_SIZE = 50;

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const range = resolveRange(params.range ?? "month", params.from, params.to);
  const category = params.category && params.category in EXPENSE_CATEGORIES ? params.category : undefined;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const deleted = params.deleted === "1";
  const link = params.link ?? "";
  const filter = dateFilter(range);

  const conditions: Prisma.ExpenseWhereInput[] = [];
  if (filter) conditions.push({ spentOn: filter });
  if (category) conditions.push({ category });
  if (q) conditions.push({ OR: [{ name: { contains: q, mode: "insensitive" } }, { notes: { contains: q, mode: "insensitive" } }] });
  if (link === "general") conditions.push({ projectId: null, clientId: null });
  else if (link === "linked") conditions.push({ OR: [{ projectId: { not: null } }, { clientId: { not: null } }] });
  else if (link.startsWith("p:")) conditions.push({ projectId: link.slice(2) });
  const scope: Prisma.ExpenseWhereInput = { AND: conditions };
  const include = { client: { select: { id: true, name: true } }, project: { select: { id: true, title: true } } } as const;
  const [monthTotal, yearTotal, allTotal, byCategory, byProject, series, rows, deletedRows, options] = await Promise.all([
    spentIn(resolveRange("month")),
    spentIn(resolveRange("year")),
    spentIn(resolveRange("all")),
    prisma.expense.groupBy({ by: ["category"], where: { ...liveExpenseWhere, ...(filter ? { spentOn: filter } : {}) }, _sum: { amountKobo: true } }),
    prisma.expense.groupBy({ by: ["projectId"], where: { ...liveExpenseWhere, ...(filter ? { spentOn: filter } : {}) }, _sum: { amountKobo: true } }),
    monthlySeries(12),
    prisma.expense.findMany({ where: { ...liveExpenseWhere, ...scope }, orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }], include }),
    deleted ? prisma.expense.findMany({ where: { ...scope, deletedAt: { not: null } }, orderBy: { spentOn: "desc" }, include }) : Promise.resolve([]),
    clientProjectOptions(),
  ]);

  const categoryTotals = byCategory.map((c) => ({ key: c.category, kobo: toKoboNumber(c._sum.amountKobo) })).sort((a, b) => b.kobo - a.kobo);
  const categoryMax = Math.max(1, ...categoryTotals.map((c) => c.kobo));
  const projectIds = byProject.map((p) => p.projectId).filter((id): id is string => !!id);
  const projectNames = new Map(
    (await prisma.clientProject.findMany({ where: { id: { in: projectIds } }, select: { id: true, title: true, client: { select: { id: true, name: true } } } })).map((p) => [p.id, p])
  );
  const projectTotals = byProject
    .map((p) => ({ id: p.projectId, kobo: toKoboNumber(p._sum.amountKobo), project: p.projectId ? projectNames.get(p.projectId) : null }))
    .sort((a, b) => b.kobo - a.kobo);
  const expenses = rows.map(toExpenseView);
  const shown = deleted ? [...expenses, ...deletedRows.map(toExpenseView)] : expenses;
  const filteredTotal = expenses.reduce((s, e) => s + e.amountKobo, 0);
  const { page, pages, slice } = paginate(shown, params.page, PAGE_SIZE);
  const labels = Object.fromEntries(series.map((s) => [s.month, monthLabel(s.month)]));
  const current = { range: range.preset, from: range.preset === "custom" ? range.from ?? undefined : undefined, to: range.preset === "custom" ? range.to ?? undefined : undefined, q: q || undefined, category, link: link || undefined, deleted: deleted ? "1" : undefined };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Business"
        title="Expenses"
        description="Everything the business spends, general or for a specific project, plus a quick calculator."
        actions={
          <>
            <a href={hrefWith("/api/admin/business/export", { type: "expenses", preset: range.preset, from: current.from, to: current.to }, {})} className={buttonClass("secondary", "sm")}>
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
            <QuickActions options={options} show={["expense"]} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "This month", kobo: monthTotal },
          { label: "This year", kobo: yearTotal },
          { label: "All recorded", kobo: allTotal },
        ].map((card) => (
          <Panel key={card.label} className="p-5">
            <p className="label-mono !text-[0.6rem]">Expenses · {card.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{formatKobo(card.kobo)}</p>
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ExpenseCalculator />
        <Panel>
          <PanelHeader title="Monthly expenses" description="Last 12 months." />
          <div className="p-5">
            <MonthChart expensesOnly data={series.map((s) => ({ month: s.month, received: s.receivedKobo, spent: s.expensesKobo }))} labels={labels} />
          </div>
        </Panel>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold">Breakdown · {range.label}</h2>
        <RangeFilter preset={range.preset} from={range.from} to={range.to} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="By category" />
          {categoryTotals.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No expenses in this period.</p>
          ) : (
            <ul className="flex flex-col gap-3 px-5 py-4">
              {categoryTotals.map((c) => (
                <li key={c.key}>
                  <div className="flex justify-between gap-3 text-sm">
                    <Link href={hrefWith("/admin/business/expenses", current, { category: c.key, page: undefined })} className="hover:text-accent-bright">
                      {EXPENSE_CATEGORIES[c.key as keyof typeof EXPENSE_CATEGORIES] ?? c.key}
                    </Link>
                    <Money kobo={c.kobo} />
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
                    <div className="h-full rounded-full bg-amber-400/80" style={{ width: `${(c.kobo / categoryMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <PanelHeader title="By project" description="General business costs aren't charged to any project." />
          {projectTotals.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No expenses in this period.</p>
          ) : (
            <ul className="divide-y divide-line">
              {projectTotals.slice(0, 10).map((p) => (
                <li key={p.id ?? "general"} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  {p.project ? (
                    <Link href={`/admin/business/clients/${p.project.client.id}#project-${p.id}`} className="min-w-0 truncate hover:text-accent-bright">
                      {p.project.client.name} → {p.project.title}
                    </Link>
                  ) : (
                    <span className="text-muted">General business (not linked to a project)</span>
                  )}
                  <Money kobo={p.kobo} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <FilterForm action="/admin/business/expenses" resetHref="/admin/business/expenses" count={expenses.length} noun={["expense", "expenses"]}>
        <input type="hidden" name="range" value={range.preset} />
        {range.preset === "custom" && (
          <>
            <input type="hidden" name="from" value={range.from ?? ""} />
            <input type="hidden" name="to" value={range.to ?? ""} />
          </>
        )}
        <FilterField label="Search" grow>
          <input type="search" name="q" defaultValue={q} placeholder="Name or notes" className="field !py-2" />
        </FilterField>
        <FilterField label="Category">
          <select name="category" defaultValue={category ?? ""} className="field !py-2">
            <option value="">All</option>
            {Object.entries(EXPENSE_CATEGORIES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Linked to">
          <select name="link" defaultValue={link} className="field !py-2">
            <option value="">Anything</option>
            <option value="general">General business only</option>
            <option value="linked">A client or project</option>
            {options.flatMap((o) =>
              o.projects.map((p) => (
                <option key={p.id} value={`p:${p.id}`}>
                  {o.name} → {p.title}
                </option>
              ))
            )}
          </select>
        </FilterField>
        <label className="flex items-center gap-2 pb-2 text-sm text-muted">
          <input type="checkbox" name="deleted" value="1" defaultChecked={deleted} className="h-4 w-4" /> Show deleted
        </label>
      </FilterForm>

      {shown.length === 0 ? (
        <EmptyState icon={<Receipt className="h-5 w-5" />} title="No expenses here" description="Add expenses as you spend, or use the calculator above and save its lines." />
      ) : (
        <>
          <Panel className="overflow-hidden">
            <PanelHeader title="Expenses" description={`${formatKobo(filteredTotal)} across ${expenses.length} record${expenses.length === 1 ? "" : "s"} matching these filters.`} />
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <caption className="sr-only">Expenses</caption>
                <thead className="border-b border-line text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Date</th>
                    <th scope="col" className="px-3 py-3 font-medium">Expense</th>
                    <th scope="col" className="px-3 py-3 font-medium">Category</th>
                    <th scope="col" className="px-3 py-3 font-medium">For</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Amount</th>
                    <th scope="col" className="px-3 py-3 font-medium">Paid with</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {slice.map((e) => (
                    <tr key={e.id} className={e.deleted ? "text-faint" : "hover:bg-white/[0.02]"}>
                      <td className="whitespace-nowrap px-4 py-3">{e.spentOn}</td>
                      <td className="px-3 py-3">
                        <p className={e.deleted ? "line-through" : ""}>{e.name}</p>
                        {e.notes && <p className="max-w-[18rem] truncate text-xs text-muted">{e.notes}</p>}
                      </td>
                      <td className="px-3 py-3 text-xs">{EXPENSE_CATEGORIES[e.category as keyof typeof EXPENSE_CATEGORIES] ?? e.category}</td>
                      <td className="px-3 py-3 text-xs">
                        {e.client ? (
                          <Link href={`/admin/business/clients/${e.client.id}`} className="hover:text-accent-bright">
                            {e.client.name}
                            {e.project ? ` → ${e.project.title}` : ""}
                          </Link>
                        ) : (
                          <span className="text-muted">General</span>
                        )}
                      </td>
                      <td className={`px-3 py-3 text-right font-medium ${e.deleted ? "line-through" : "text-amber-300"}`}><Money kobo={e.amountKobo} /></td>
                      <td className="px-3 py-3 text-xs">{e.method ? PAYMENT_METHODS[e.method as keyof typeof PAYMENT_METHODS] : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {e.hasReceipt && (
                            <a href={`/api/admin/business/expenses/${e.id}/receipt`} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm", "!px-2.5")}>
                              Receipt
                            </a>
                          )}
                          {!e.deleted && <EditExpenseButton options={options} expense={e} />}
                          <DeleteRestore url={`/api/admin/business/expenses/${e.id}`} deleted={e.deleted} noun="expense" compact />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Pagination page={page} pages={pages} href={(n) => hrefWith("/admin/business/expenses", current, { page: String(n) })} />
        </>
      )}
    </div>
  );
}
