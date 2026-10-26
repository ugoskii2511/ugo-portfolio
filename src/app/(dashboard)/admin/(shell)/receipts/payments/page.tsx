import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2, History } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { EmptyState, PageHeader, Panel, StatusPill } from "@/components/admin/ui";
import { Money } from "@/components/admin/business/bits";
import { FilterField, FilterForm, hrefWith, paginate, Pagination } from "@/components/admin/business/list-controls";
import { EditPaymentButton } from "@/components/admin/business/row-actions";
import { PaymentStatusButton } from "@/components/admin/receipts/payment-status-button";
import { buttonClass } from "@/components/site/button";
import { clientProjectOptions } from "@/lib/business";
import { isValidDay, PAYMENT_METHODS } from "@/lib/business-calc";
import { loadPaymentRecords, type PaymentRecordRow } from "@/lib/receipts-data";
import { methodLabel, PAYMENT_RECORD_STATUSES, PAYMENT_RECORD_STATUS_LABEL, type PaymentRecordStatus } from "@/lib/receipt-calc";
import { formatKobo } from "@/lib/money";

export const metadata: Metadata = { title: "Payment history" };

type Search = { q?: string; client?: string; method?: string; status?: string; receipt?: string; from?: string; to?: string; sort?: string; page?: string };

const SORTS: Record<string, { label: string; fn: (a: PaymentRecordRow, b: PaymentRecordRow) => number }> = {
  newest: { label: "Newest first", fn: (a, b) => b.paidOn.localeCompare(a.paidOn) || b.createdAt.localeCompare(a.createdAt) },
  oldest: { label: "Oldest first", fn: (a, b) => a.paidOn.localeCompare(b.paidOn) || a.createdAt.localeCompare(b.createdAt) },
  amount_desc: { label: "Largest amount", fn: (a, b) => b.amountKobo - a.amountKobo },
  amount_asc: { label: "Smallest amount", fn: (a, b) => a.amountKobo - b.amountKobo },
  client: { label: "Client A–Z", fn: (a, b) => a.client.name.localeCompare(b.client.name) },
};
const PAGE_SIZE = 50;

export default async function PaymentHistoryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const method = params.method && params.method in PAYMENT_METHODS ? params.method : undefined;
  const status = (PAYMENT_RECORD_STATUSES as readonly string[]).includes(params.status ?? "") ? (params.status as PaymentRecordStatus) : undefined;
  const receipt = params.receipt === "missing" || params.receipt === "has" ? params.receipt : undefined;
  const from = isValidDay(params.from) ? params.from : undefined;
  const to = isValidDay(params.to) ? params.to : undefined;
  const sort = params.sort && params.sort in SORTS ? params.sort : "newest";

  const where: Prisma.ClientPaymentWhereInput = {
    ...(params.client ? { clientId: params.client } : {}),
    ...(method ? { method } : {}),
    ...(status ? { status } : {}),
    ...(from || to ? { paidOn: { ...(from ? { gte: new Date(`${from}T00:00:00Z`) } : {}), ...(to ? { lte: new Date(`${to}T00:00:00Z`) } : {}) } } : {}),
  };
  const [all, options] = await Promise.all([loadPaymentRecords(where), clientProjectOptions()]);
  const rows = all
    .filter((p) => !receipt || (receipt === "has" ? !!p.receipt : !p.receipt && p.status === "CONFIRMED"))
    .filter((p) => !q || [p.client.name, p.project?.title ?? "", p.reference ?? "", p.description ?? "", p.receipt?.number ?? ""].some((v) => v.toLowerCase().includes(q)))
    .sort(SORTS[sort].fn);
  const confirmedTotal = rows.filter((p) => p.status === "CONFIRMED").reduce((s, p) => s + p.amountKobo, 0);
  const { page, pages, slice } = paginate(rows, params.page, PAGE_SIZE);
  const current = { q: params.q, client: params.client, method, status, receipt, from, to, sort: sort === "newest" ? undefined : sort };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Receipts & Payments"
        title="Payment history"
        description="Every payment on record with its receipt. Mark a payment failed, cancelled, reversed or refunded here: it stops counting and its receipt is voided, but nothing is erased."
        actions={
          <Link href="/admin/receipts/new" className={buttonClass("primary", "sm")}>
            <FilePlus2 className="h-4 w-4" aria-hidden /> Generate receipt
          </Link>
        }
      />

      <FilterForm action="/admin/receipts/payments" resetHref="/admin/receipts/payments" count={rows.length} noun={["payment", "payments"]}>
        <FilterField label="Search" grow>
          <input type="search" name="q" defaultValue={params.q ?? ""} placeholder="Client, project, reference or receipt no." className="field !py-2" />
        </FilterField>
        <FilterField label="Client">
          <select name="client" defaultValue={params.client ?? ""} className="field !py-2">
            <option value="">All clients</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ""} className="field !py-2">
            <option value="">Any</option>
            {PAYMENT_RECORD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_RECORD_STATUS_LABEL[s]}
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
        <FilterField label="Receipt">
          <select name="receipt" defaultValue={receipt ?? ""} className="field !py-2">
            <option value="">Any</option>
            <option value="has">Has a receipt</option>
            <option value="missing">No receipt yet</option>
          </select>
        </FilterField>
        <FilterField label="Paid from">
          <input type="date" name="from" defaultValue={from ?? ""} className="field !py-2" />
        </FilterField>
        <FilterField label="to">
          <input type="date" name="to" defaultValue={to ?? ""} className="field !py-2" />
        </FilterField>
        <FilterField label="Sort">
          <select name="sort" defaultValue={sort} className="field !py-2">
            {Object.entries(SORTS).map(([v, s]) => (
              <option key={v} value={v}>
                {s.label}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterForm>

      <p className="text-sm text-muted">
        Confirmed in this list: <span className="font-medium text-emerald-300">{formatKobo(confirmedTotal)}</span>
      </p>

      {rows.length === 0 ? (
        <EmptyState icon={<History className="h-5 w-5" />} title="No payments here" description="Payments appear here when you generate a receipt or record a payment in Business." />
      ) : (
        <>
          <Panel className="overflow-hidden">
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <caption className="sr-only">Payment history</caption>
                <thead className="border-b border-line text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Paid on</th>
                    <th scope="col" className="px-3 py-3 font-medium">Client · project</th>
                    <th scope="col" className="px-3 py-3 font-medium">Description</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Amount</th>
                    <th scope="col" className="px-3 py-3 font-medium">Method · ref.</th>
                    <th scope="col" className="px-3 py-3 font-medium">Receipt</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {slice.map((p) => (
                    <tr key={p.id} className={p.status === "CONFIRMED" ? "hover:bg-white/[0.02]" : "text-faint"}>
                      <td className="whitespace-nowrap px-4 py-3">{p.paidOn}</td>
                      <td className="max-w-[16rem] px-3 py-3">
                        <Link href={`/admin/receipts/clients/${p.client.id}`} className="block truncate hover:text-accent-bright">
                          {p.client.name}
                        </Link>
                        <span className="block truncate text-xs text-muted">{p.project?.title ?? "—"}{p.kind === "MAINTENANCE" ? " · hosting/maintenance" : ""}</span>
                      </td>
                      <td className="max-w-[12rem] px-3 py-3">
                        <span className="block truncate">{p.description ?? "—"}</span>
                        {p.status !== "CONFIRMED" && (
                          <span className="mt-1 block" title={p.statusReason ?? undefined}>
                            <StatusPill tone="danger">{PAYMENT_RECORD_STATUS_LABEL[p.status]}</StatusPill>
                          </span>
                        )}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-3 text-right font-medium ${p.status === "CONFIRMED" ? "text-emerald-300" : "line-through"}`}>
                        <Money kobo={p.amountKobo} />
                      </td>
                      <td className="max-w-[12rem] px-3 py-3">
                        {methodLabel(p.method)}
                        {p.reference && <span className="block truncate text-xs text-muted">{p.reference}</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {p.receipt ? (
                          <Link href={`/admin/receipts/${p.receipt.id}`} className="font-mono text-xs text-accent-bright hover:underline">
                            {p.receipt.number}
                          </Link>
                        ) : p.status === "CONFIRMED" ? (
                          <Link href={`/admin/receipts/new?payment=${p.id}`} className="text-xs text-amber-300 hover:underline">
                            Issue receipt
                          </Link>
                        ) : (
                          <span className="text-xs">—</span>
                        )}
                        {p.voidedReceipts > 0 && <span className="block text-[0.7rem] text-faint">{p.voidedReceipts} voided</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {p.project && (
                            <EditPaymentButton
                              options={options}
                              payment={{ id: p.id, projectId: p.project.id, clientId: p.client.id, kind: p.kind, amountKobo: p.amountKobo, paidOn: p.paidOn, method: p.method, reference: p.reference, description: p.description, notes: p.notes }}
                            />
                          )}
                          <PaymentStatusButton id={p.id} status={p.status} label={`${formatKobo(p.amountKobo)} from ${p.client.name} on ${p.paidOn}`} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Pagination page={page} pages={pages} href={(n) => hrefWith("/admin/receipts/payments", current, { page: String(n) })} />
        </>
      )}
    </div>
  );
}
