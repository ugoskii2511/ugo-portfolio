import type { Metadata } from "next";
import Link from "next/link";
import { Download, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/admin/ui";
import { buttonClass } from "@/components/site/button";
import { DeleteRestore, Money, RangeFilter } from "@/components/admin/business/bits";
import { QuickActions } from "@/components/admin/business/quick-actions";
import { EditPaymentButton } from "@/components/admin/business/row-actions";
import { FilterField, FilterForm, hrefWith, paginate, Pagination } from "@/components/admin/business/list-controls";
import { clientProjectOptions, livePaymentWhere, toPaymentView } from "@/lib/business";
import { dateFilter, PAYMENT_METHODS, resolveRange } from "@/lib/business-calc";
import { formatKobo } from "@/lib/money";

export const metadata: Metadata = { title: "Payments" };

type Search = { range?: string; from?: string; to?: string; client?: string; method?: string; kind?: string; deleted?: string; page?: string };
const PAGE_SIZE = 50;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const range = resolveRange(params.range ?? "all", params.from, params.to);
  const method = params.method && params.method in PAYMENT_METHODS ? params.method : undefined;
  const kind = params.kind === "PROJECT" || params.kind === "MAINTENANCE" ? params.kind : undefined;
  const deleted = params.deleted === "1";
  const filter = dateFilter(range);

  const scope: Prisma.ClientPaymentWhereInput = {
    ...(filter ? { paidOn: filter } : {}),
    ...(params.client ? { clientId: params.client } : {}),
    ...(method ? { method } : {}),
    ...(kind ? { kind } : {}),
  };
  const [rows, deletedRows, options] = await Promise.all([
    prisma.clientPayment.findMany({
      where: { ...livePaymentWhere, ...scope },
      orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
      include: { client: { select: { id: true, name: true } }, project: { select: { id: true, title: true } } },
    }),
    deleted
      ? prisma.clientPayment.findMany({
          where: { ...scope, deletedAt: { not: null } },
          orderBy: [{ paidOn: "desc" }],
          include: { client: { select: { id: true, name: true } }, project: { select: { id: true, title: true } } },
        })
      : Promise.resolve([]),
    clientProjectOptions(),
  ]);
  const payments = rows.map(toPaymentView);
  const total = payments.reduce((s, p) => s + p.amountKobo, 0);
  const byMethod = Object.entries(
    payments.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.method]: (acc[p.method] ?? 0) + p.amountKobo }), {})
  ).sort((a, b) => b[1] - a[1]);
  const shown = deleted ? [...payments, ...deletedRows.map(toPaymentView)] : payments;
  const { page, pages, slice } = paginate(shown, params.page, PAGE_SIZE);
  const current = { range: range.preset, from: range.preset === "custom" ? range.from ?? undefined : undefined, to: range.preset === "custom" ? range.to ?? undefined : undefined, client: params.client, method, kind, deleted: deleted ? "1" : undefined };
  const exportHref = hrefWith("/api/admin/business/export", { type: "payments", preset: range.preset, from: current.from, to: current.to, client: params.client }, {});

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Business"
        title="Payments"
        description="Every payment received from every client. All balances and revenue figures are calculated from this list."
        actions={
          <>
            <a href={exportHref} className={buttonClass("secondary", "sm")}>
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
            <QuickActions options={options} show={["payment"]} />
          </>
        }
      />

      <RangeFilter preset={range.preset} from={range.from} to={range.to} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <Panel className="p-5">
          <p className="label-mono !text-[0.6rem]">Received · {range.label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-emerald-300">{formatKobo(total)}</p>
          <p className="mt-1 text-xs text-muted">
            {payments.length} payment{payments.length === 1 ? "" : "s"}
            {params.client ? ` from ${options.find((o) => o.id === params.client)?.name ?? "this client"}` : ""}
          </p>
        </Panel>
        <Panel>
          <PanelHeader title="By payment method" />
          {byMethod.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">Nothing in this period.</p>
          ) : (
            <ul className="grid gap-x-6 gap-y-2 px-5 py-4 text-sm sm:grid-cols-2">
              {byMethod.map(([m, kobo]) => (
                <li key={m} className="flex justify-between gap-3">
                  <span className="text-muted">{PAYMENT_METHODS[m as keyof typeof PAYMENT_METHODS] ?? m}</span>
                  <Money kobo={kobo} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <FilterForm action="/admin/business/payments" resetHref="/admin/business/payments" count={payments.length} noun={["payment", "payments"]}>
        <input type="hidden" name="range" value={range.preset} />
        {range.preset === "custom" && (
          <>
            <input type="hidden" name="from" value={range.from ?? ""} />
            <input type="hidden" name="to" value={range.to ?? ""} />
          </>
        )}
        <FilterField label="Client" grow>
          <select name="client" defaultValue={params.client ?? ""} className="field !py-2">
            <option value="">All clients</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Method">
          <select name="method" defaultValue={method ?? ""} className="field !py-2">
            <option value="">Any</option>
            {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="For">
          <select name="kind" defaultValue={kind ?? ""} className="field !py-2">
            <option value="">Anything</option>
            <option value="PROJECT">Project price</option>
            <option value="MAINTENANCE">Hosting / maintenance</option>
          </select>
        </FilterField>
        <label className="flex items-center gap-2 pb-2 text-sm text-muted">
          <input type="checkbox" name="deleted" value="1" defaultChecked={deleted} className="h-4 w-4" /> Show deleted
        </label>
      </FilterForm>

      {shown.length === 0 ? (
        <EmptyState icon={<Wallet className="h-5 w-5" />} title="No payments here" description="Record payments as they come in. Each one updates the client's balance straight away." />
      ) : (
        <>
          <Panel className="overflow-hidden">
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <caption className="sr-only">Payments</caption>
                <thead className="border-b border-line text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Date</th>
                    <th scope="col" className="px-3 py-3 font-medium">Client</th>
                    <th scope="col" className="px-3 py-3 font-medium">Project</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Amount</th>
                    <th scope="col" className="px-3 py-3 font-medium">Method</th>
                    <th scope="col" className="px-3 py-3 font-medium">Reference</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {slice.map((p) => (
                    <tr key={p.id} className={p.deleted ? "text-faint" : "hover:bg-white/[0.02]"}>
                      <td className="whitespace-nowrap px-4 py-3">{p.paidOn}</td>
                      <td className="px-3 py-3">
                        <Link href={`/admin/business/clients/${p.client.id}`} className="hover:text-accent-bright">
                          {p.client.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        {p.project?.title ?? "—"}
                        {p.kind === "MAINTENANCE" && <span className="block text-xs text-muted">hosting / maintenance</span>}
                      </td>
                      <td className={`px-3 py-3 text-right font-medium ${p.deleted ? "line-through" : "text-emerald-300"}`}><Money kobo={p.amountKobo} /></td>
                      <td className="px-3 py-3">{PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS] ?? p.method}</td>
                      <td className="max-w-[14rem] truncate px-3 py-3 text-muted">{p.reference ?? ""}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {!p.deleted && <EditPaymentButton options={options} payment={{ id: p.id, projectId: p.project?.id ?? null, clientId: p.client.id, kind: p.kind, amountKobo: p.amountKobo, paidOn: p.paidOn, method: p.method, reference: p.reference }} />}
                          <DeleteRestore url={`/api/admin/business/payments/${p.id}`} deleted={p.deleted} noun="payment" detail={`Remove this ${formatKobo(p.amountKobo)} payment from ${p.client.name}? Their balance goes back up. It's kept in the audit log and can be restored.`} compact />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Pagination page={page} pages={pages} href={(n) => hrefWith("/admin/business/payments", current, { page: String(n) })} />
        </>
      )}
    </div>
  );
}
