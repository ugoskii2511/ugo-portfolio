import type { Metadata } from "next";
import Link from "next/link";
import { Download, FilePlus2, Files } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { EmptyState, PageHeader, Panel, StatusPill } from "@/components/admin/ui";
import { PaymentStatusPill } from "@/components/admin/business/bits";
import { FilterField, FilterForm, hrefWith, paginate, Pagination } from "@/components/admin/business/list-controls";
import { buttonClass } from "@/components/site/button";
import { isValidDay, PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_STATUS_LABEL, type PaymentStatus } from "@/lib/business-calc";
import { loadReceiptRows, type ReceiptRow } from "@/lib/receipts-data";
import { formatMinor } from "@/lib/receipt-calc";

export const metadata: Metadata = { title: "All receipts" };

type Search = { q?: string; status?: string; method?: string; pstatus?: string; from?: string; to?: string; sort?: string; page?: string };

const SORTS: Record<string, { label: string; fn: (a: ReceiptRow, b: ReceiptRow) => number }> = {
  newest: { label: "Newest first", fn: (a, b) => b.issueDate.localeCompare(a.issueDate) || b.createdAt.localeCompare(a.createdAt) },
  oldest: { label: "Oldest first", fn: (a, b) => a.issueDate.localeCompare(b.issueDate) || a.createdAt.localeCompare(b.createdAt) },
  amount_desc: { label: "Largest amount", fn: (a, b) => b.amountKobo - a.amountKobo },
  amount_asc: { label: "Smallest amount", fn: (a, b) => a.amountKobo - b.amountKobo },
  client: { label: "Client A–Z", fn: (a, b) => a.clientName.localeCompare(b.clientName) },
  number: { label: "Receipt number", fn: (a, b) => b.number.localeCompare(a.number, undefined, { numeric: true }) },
};

const PAGE_SIZE = 40;

export default async function AllReceiptsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const status = params.status === "ISSUED" || params.status === "VOIDED" ? params.status : undefined;
  const method = params.method && params.method in PAYMENT_METHODS ? params.method : undefined;
  const pstatus = (PAYMENT_STATUSES as readonly string[]).includes(params.pstatus ?? "") ? (params.pstatus as PaymentStatus) : undefined;
  const from = isValidDay(params.from) ? params.from : undefined;
  const to = isValidDay(params.to) ? params.to : undefined;
  const sort = params.sort && params.sort in SORTS ? params.sort : "newest";

  const where: Prisma.ReceiptWhereInput = {
    ...(status ? { status } : {}),
    ...(from || to ? { issueDate: { ...(from ? { gte: new Date(`${from}T00:00:00Z`) } : {}), ...(to ? { lte: new Date(`${to}T00:00:00Z`) } : {}) } } : {}),
  };
  const all = await loadReceiptRows(where);
  const rows = all
    .filter((r) => !method || r.method === method)
    .filter((r) => !pstatus || r.paymentStatus === pstatus)
    .filter((r) => !q || [r.number, r.clientName, r.projectTitle ?? "", r.paymentDescription].some((v) => v.toLowerCase().includes(q)))
    .sort(SORTS[sort].fn);
  const { page, pages, slice } = paginate(rows, params.page, PAGE_SIZE);
  const current = { q: params.q, status, method, pstatus, from, to, sort: sort === "newest" ? undefined : sort };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Receipts & Payments"
        title="All receipts"
        description="Every receipt ever issued, including voided ones (kept for the record). Search by receipt number, client or project."
        actions={
          <Link href="/admin/receipts/new" className={buttonClass("primary", "sm")}>
            <FilePlus2 className="h-4 w-4" aria-hidden /> Generate receipt
          </Link>
        }
      />

      <FilterForm action="/admin/receipts/all" resetHref="/admin/receipts/all" count={rows.length} noun={["receipt", "receipts"]}>
        <FilterField label="Search" grow>
          <input type="search" name="q" defaultValue={params.q ?? ""} placeholder="RCT-2026-0001, client or project" className="field !py-2" />
        </FilterField>
        <FilterField label="Receipt">
          <select name="status" defaultValue={status ?? ""} className="field !py-2">
            <option value="">Any</option>
            <option value="ISSUED">Issued</option>
            <option value="VOIDED">Voided</option>
          </select>
        </FilterField>
        <FilterField label="Payment status">
          <select name="pstatus" defaultValue={pstatus ?? ""} className="field !py-2">
            <option value="">Any</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_LABEL[s]}
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
        <FilterField label="Issued from">
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

      {rows.length === 0 ? (
        <EmptyState icon={<Files className="h-5 w-5" />} title={all.length ? "No receipts match" : "No receipts yet"} description={all.length ? "Try a different search or clear the filters." : "Generate a receipt when a client pays. Each deposit gets its own receipt."} />
      ) : (
        <>
          {/* Phones: cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {slice.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/receipts/${r.id}`} className="block rounded-2xl border border-line bg-raised p-4 transition-colors hover:border-line-strong">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-accent-bright">{r.number}</p>
                      <p className="mt-0.5 truncate text-sm">{r.clientName}</p>
                      <p className="truncate text-xs text-muted">{r.projectTitle ?? "General payment"} · {r.paymentDescription}</p>
                    </div>
                    <p className={`shrink-0 text-right font-medium tabular-nums ${r.status === "VOIDED" ? "text-muted line-through" : "text-emerald-300"}`}>{formatMinor(r.amountKobo, r.currencySymbol)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{r.issueDate}</span>
                    <span>· {r.methodLabel}</span>
                    {r.status === "VOIDED" ? <StatusPill tone="danger">Voided</StatusPill> : <PaymentStatusPill status={r.paymentStatus} />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Panel className="hidden overflow-hidden md:block">
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <caption className="sr-only">Receipts</caption>
                <thead className="border-b border-line text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Receipt</th>
                    <th scope="col" className="px-3 py-3 font-medium">Issued</th>
                    <th scope="col" className="px-3 py-3 font-medium">Client · project</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">This payment</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Outstanding after</th>
                    <th scope="col" className="px-3 py-3 font-medium">Method</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {slice.map((r) => (
                    <tr key={r.id} className={r.status === "VOIDED" ? "text-faint" : "hover:bg-white/[0.02]"}>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link href={`/admin/receipts/${r.id}`} className="font-mono text-accent-bright hover:underline">
                          {r.number}
                        </Link>
                        <a href={`/api/admin/receipts/${r.id}/pdf?download=1`} className="ml-2 inline-flex align-middle text-muted hover:text-fg" aria-label={`Download ${r.number} as PDF`} title="Download PDF">
                          <Download className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">{r.issueDate}</td>
                      <td className="max-w-[18rem] px-3 py-3">
                        <Link href={`/admin/receipts/clients/${r.clientId}`} className="block truncate hover:text-accent-bright">
                          {r.clientName}
                        </Link>
                        <span className="block truncate text-xs text-muted">
                          {r.projectTitle ?? "General payment"} · {r.paymentDescription}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums ${r.status === "VOIDED" ? "line-through" : "text-emerald-300"}`}>{formatMinor(r.amountKobo, r.currencySymbol)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-muted">{formatMinor(r.outstandingKobo, r.currencySymbol)}</td>
                      <td className="whitespace-nowrap px-3 py-3">{r.methodLabel}</td>
                      <td className="px-4 py-3">
                        {r.status === "VOIDED" ? (
                          <span title={r.voidReason ?? undefined}>
                            <StatusPill tone="danger">Voided</StatusPill>
                          </span>
                        ) : (
                          <PaymentStatusPill status={r.paymentStatus} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Pagination page={page} pages={pages} href={(n) => hrefWith("/admin/receipts/all", current, { page: String(n) })} />
        </>
      )}
    </div>
  );
}
