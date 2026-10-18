import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Banknote, Briefcase, CalendarClock, CheckCircle2, Hammer, Receipt, TrendingUp, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/admin/ui";
import { MonthChart, Money, RangeFilter } from "@/components/admin/business/bits";
import { QuickActions } from "@/components/admin/business/quick-actions";
import { clientProjectOptions, livePaymentWhere, loadOverview, loadProjects, monthlySeries, toPaymentView } from "@/lib/business";
import { currentMonthRange, lagosToday, monthLabel, PAYMENT_METHODS, resolveRange, timestampFilter } from "@/lib/business-calc";
import { formatKobo } from "@/lib/money";

export const metadata: Metadata = { title: "Business overview" };

type Search = { range?: string; from?: string; to?: string };

export default async function BusinessOverviewPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const range = resolveRange(params.range ?? "month", params.from, params.to);
  const month = currentMonthRange();
  const today = lagosToday();
  const [overview, series, recent, projects, options] = await Promise.all([
    loadOverview(range, month, timestampFilter(range)),
    monthlySeries(12),
    prisma.clientPayment.findMany({
      where: livePaymentWhere,
      orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { client: { select: { id: true, name: true } }, project: { select: { id: true, title: true } } },
    }),
    loadProjects(),
    clientProjectOptions(),
  ]);

  const owing = projects.filter((p) => p.outstandingKobo > 0).sort((a, b) => b.outstandingKobo - a.outstandingKobo).slice(0, 6);
  const soon = projects
    .flatMap((p) => [
      ...(p.expectedDeliveryDate && !["COMPLETED", "CANCELLED"].includes(p.status) ? [{ p, date: p.expectedDeliveryDate, what: "Delivery due" }] : []),
      ...(p.nextPaymentDate && p.status !== "CANCELLED" ? [{ p, date: p.nextPaymentDate, what: "Payment due" }] : []),
    ])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  const empty = overview.totalClients === 0 && overview.expensesKobo === 0 && recent.length === 0;
  const labels = Object.fromEntries(series.map((s) => [s.month, monthLabel(s.month)]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Business"
        title="Business overview"
        description="Clients, money in and money out, all calculated from the payments and expenses you record."
        actions={<QuickActions options={options} />}
      />

      {empty ? (
        <EmptyState
          icon={<Briefcase className="h-5 w-5" />}
          title="No business records yet"
          description="Add your first client (and their project), then record payments and expenses as they happen. These cards fill in automatically."
        />
      ) : null}

      <section aria-labelledby="period-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="period-title" className="text-sm font-semibold">
              Cash flow · {range.label}
            </h2>
            <p className="text-xs text-muted">Money that actually came in and went out in this period.</p>
          </div>
          <RangeFilter preset={range.preset} from={range.from} to={range.to} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Money received" value={formatKobo(overview.receivedKobo)} icon={<Wallet className="h-4 w-4" />} detail="Sum of recorded payments" href="/admin/business/payments" />
          <StatCard label="Business expenses" value={formatKobo(overview.expensesKobo)} icon={<Receipt className="h-4 w-4" />} detail="Sum of recorded expenses" href="/admin/business/expenses" />
          <StatCard
            label="Net cash flow"
            value={formatKobo(overview.netCashFlowKobo)}
            icon={<TrendingUp className="h-4 w-4" />}
            detail="Received − expenses"
            tone={overview.netCashFlowKobo < 0 ? "attention" : "default"}
          />
          <StatCard label="Revenue this month" value={formatKobo(overview.monthRevenueKobo)} icon={<Banknote className="h-4 w-4" />} detail={`Received since ${month.from}`} />
        </div>
      </section>

      <section aria-labelledby="now-title" className="flex flex-col gap-4">
        <div>
          <h2 id="now-title" className="text-sm font-semibold">
            Where things stand now
          </h2>
          <p className="text-xs text-muted">Across all records. Cancelled projects are kept but never counted here.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Total clients"
            value={overview.totalClients}
            icon={<Users className="h-4 w-4" />}
            detail={range.preset === "all" ? "All time" : `${overview.newClients} added ${range.label.toLowerCase()}`}
            href="/admin/business/clients"
          />
          <StatCard label="Total project value" value={formatKobo(overview.totalProjectValueKobo)} icon={<Briefcase className="h-4 w-4" />} detail="Agreed prices, excluding cancelled" href="/admin/business/projects" />
          <StatCard
            label="Outstanding payments"
            value={formatKobo(overview.outstandingKobo)}
            icon={<AlertCircle className="h-4 w-4" />}
            detail={`${overview.unpaidClients} client${overview.unpaidClients === 1 ? "" : "s"} still owe you`}
            tone={overview.outstandingKobo > 0 ? "attention" : "default"}
            href="/admin/business/clients?payment=owing"
          />
          <StatCard label="Active projects" value={overview.activeProjects} icon={<Hammer className="h-4 w-4" />} detail="Status: In progress" href="/admin/business/projects?status=IN_PROGRESS" />
          <StatCard label="Completed projects" value={overview.completedProjects} icon={<CheckCircle2 className="h-4 w-4" />} detail="Status: Completed" href="/admin/business/projects?status=COMPLETED" />
          <StatCard label="Unpaid clients" value={overview.unpaidClients} icon={<Users className="h-4 w-4" />} detail="With an outstanding balance" href="/admin/business/clients?payment=owing" />
        </div>
      </section>

      <Panel>
        <PanelHeader title="Last 12 months" description="Money received vs business expenses, by month." action={<Link href="/admin/business/reports" className="text-xs text-accent-bright hover:underline">Reports</Link>} />
        <div className="p-5">
          <MonthChart data={series.map((s) => ({ month: s.month, received: s.receivedKobo, spent: s.expensesKobo }))} labels={labels} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Recent payments" action={<Link href="/admin/business/payments" className="text-xs text-accent-bright hover:underline">All payments</Link>} />
          {recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map(toPaymentView).map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/business/clients/${p.client.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-white/[0.02]">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.client.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {p.paidOn} · {PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS] ?? p.method}
                      </span>
                    </span>
                    <Money kobo={p.amountKobo} className="shrink-0 font-medium text-emerald-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <PanelHeader title="Who owes you" description="Largest outstanding balances." />
          {owing.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">Nobody owes you anything right now.</p>
          ) : (
            <ul className="divide-y divide-line">
              {owing.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/business/clients/${p.client.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-white/[0.02]">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.client.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {p.title} · paid {formatKobo(p.paidKobo)} of {formatKobo(p.priceKobo)}
                      </span>
                    </span>
                    <Money kobo={p.outstandingKobo} className="shrink-0 font-medium text-amber-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <PanelHeader title="Coming up" description="Deliveries and payment dates." />
          {soon.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No dates set. Add expected delivery or next payment dates to projects.</p>
          ) : (
            <ul className="divide-y divide-line">
              {soon.map(({ p, date, what }) => (
                <li key={`${p.id}-${what}`}>
                  <Link href={`/admin/business/clients/${p.client.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-white/[0.02]">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.client.name}</span>
                      <span className="flex items-center gap-2 text-xs text-muted">
                        <CalendarClock className="h-3 w-3" aria-hidden /> {what} · {p.title}
                      </span>
                    </span>
                    <span className={`shrink-0 text-xs ${date < today ? "text-red-300" : "text-muted"}`}>{date < today ? `Overdue (${date})` : date}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
