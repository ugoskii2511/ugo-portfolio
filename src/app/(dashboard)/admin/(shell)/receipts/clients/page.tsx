import type { Metadata } from "next";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader, Panel } from "@/components/admin/ui";
import { Money, PaymentStatusPill } from "@/components/admin/business/bits";
import { FilterField, FilterForm } from "@/components/admin/business/list-controls";
import { livePaymentWhere, loadClients, type ClientRow } from "@/lib/business";
import { PAYMENT_STATUSES, PAYMENT_STATUS_LABEL, type PaymentStatus } from "@/lib/business-calc";

export const metadata: Metadata = { title: "Client accounts" };

type Search = { q?: string; pstatus?: string; sort?: string };
type Row = ClientRow & { receipts: number; lastPaid: string | null };

const SORTS: Record<string, { label: string; fn: (a: Row, b: Row) => number }> = {
  recent: { label: "Last paid", fn: (a, b) => (b.lastPaid ?? "").localeCompare(a.lastPaid ?? "") },
  owing: { label: "Most owed", fn: (a, b) => b.outstandingKobo - a.outstandingKobo },
  paid: { label: "Most paid", fn: (a, b) => b.paidKobo - a.paidKobo },
  name: { label: "Name A–Z", fn: (a, b) => a.name.localeCompare(b.name) },
};

export default async function ReceiptClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const pstatus = (PAYMENT_STATUSES as readonly string[]).includes(params.pstatus ?? "") ? (params.pstatus as PaymentStatus) : undefined;
  const sort = params.sort && params.sort in SORTS ? params.sort : "recent";

  const [clients, receiptCounts, lastPayments] = await Promise.all([
    loadClients(),
    prisma.receipt.groupBy({ by: ["clientId"], where: { status: "ISSUED" }, _count: { _all: true } }),
    prisma.clientPayment.groupBy({ by: ["clientId"], where: livePaymentWhere, _max: { paidOn: true } }),
  ]);
  const receipts = new Map(receiptCounts.map((r) => [r.clientId, r._count._all]));
  const last = new Map(lastPayments.map((r) => [r.clientId, r._max.paidOn?.toISOString().slice(0, 10) ?? null]));
  const rows: Row[] = clients
    .map((c) => ({ ...c, receipts: receipts.get(c.id) ?? 0, lastPaid: last.get(c.id) ?? null }))
    .filter((c) => !pstatus || c.paymentStatus === pstatus)
    .filter((c) => !q || [c.name, c.businessName ?? "", c.email ?? "", c.phone ?? ""].some((v) => v.toLowerCase().includes(q)))
    .sort(SORTS[sort].fn);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Receipts & Payments" title="Client accounts" description="What each client has paid, what they still owe, and their receipts." />

      <FilterForm action="/admin/receipts/clients" resetHref="/admin/receipts/clients" count={rows.length} noun={["client", "clients"]}>
        <FilterField label="Search" grow>
          <input type="search" name="q" defaultValue={params.q ?? ""} placeholder="Name, business, email or phone" className="field !py-2" />
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
        <EmptyState icon={<UserRound className="h-5 w-5" />} title={clients.length ? "No clients match" : "No clients yet"} description="Clients are added when you generate a receipt for someone new, or in Business → Clients." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((c) => (
            <li key={c.id}>
              <Panel as="div" className="h-full transition-colors hover:border-line-strong">
                <Link href={`/admin/receipts/clients/${c.id}`} className="block p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.name}</p>
                      <p className="truncate text-xs text-muted">{[c.businessName, c.email, c.phone].filter(Boolean).join(" · ") || "No contact details"}</p>
                    </div>
                    <PaymentStatusPill status={c.paymentStatus} />
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-faint">Paid</dt>
                      <dd className="text-emerald-300"><Money kobo={c.paidKobo} /></dd>
                    </div>
                    <div>
                      <dt className="text-xs text-faint">Outstanding</dt>
                      <dd className={c.outstandingKobo > 0 ? "text-amber-300" : ""}><Money kobo={c.outstandingKobo} /></dd>
                    </div>
                    <div>
                      <dt className="text-xs text-faint">Receipts</dt>
                      <dd>{c.receipts}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs text-faint">
                    {c.projectCount} project{c.projectCount === 1 ? "" : "s"} · {c.lastPaid ? `last paid ${c.lastPaid}` : "no payments yet"}
                  </p>
                </Link>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
