import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, CheckCircle2, CircleDashed, FilePlus2, Files, ReceiptText, Users, Wallet } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState, PageHeader, Panel, PanelHeader, StatusPill } from "@/components/admin/ui";
import { Money, PaymentStatusPill } from "@/components/admin/business/bits";
import { buttonClass } from "@/components/site/button";
import { loadProjects } from "@/lib/business";
import { loadPaymentRecords, loadReceiptOverview } from "@/lib/receipts-data";
import { methodLabel, PAYMENT_RECORD_STATUS_LABEL } from "@/lib/receipt-calc";
import { formatKobo } from "@/lib/money";

export const metadata: Metadata = { title: "Receipts & Payments" };

export default async function ReceiptsOverviewPage() {
  const projects = await loadProjects();
  const [overview, recent] = await Promise.all([loadReceiptOverview(projects), loadPaymentRecords({}, 10)]);
  const owing = projects.filter((p) => p.outstandingKobo > 0).sort((a, b) => b.outstandingKobo - a.outstandingKobo).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Receipts & Payments"
        title="Receipts overview"
        description="Every figure here is worked out from the payments you've recorded. Failed, cancelled, reversed and refunded payments never count."
        actions={
          <>
            <Link href="/admin/receipts/all" className={buttonClass("secondary", "sm")}>
              <Files className="h-4 w-4" aria-hidden /> All receipts
            </Link>
            <Link href="/admin/receipts/new" className={buttonClass("primary", "sm")}>
              <FilePlus2 className="h-4 w-4" aria-hidden /> Generate receipt
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total payments recorded" value={formatKobo(overview.totalReceivedKobo)} icon={<Wallet className="h-4 w-4" />} detail="All confirmed payments, all time" href="/admin/receipts/payments" />
        <StatCard
          label="Total outstanding"
          value={formatKobo(overview.outstandingKobo)}
          icon={<AlertCircle className="h-4 w-4" />}
          detail="Still owed on active projects"
          tone={overview.outstandingKobo > 0 ? "attention" : "default"}
          href="/admin/receipts/clients?sort=owing"
        />
        <StatCard label="Clients" value={overview.clients} icon={<Users className="h-4 w-4" />} detail="With a client record" href="/admin/receipts/clients" />
        <StatCard
          label="Receipts generated"
          value={overview.receiptsIssued}
          icon={<ReceiptText className="h-4 w-4" />}
          detail={overview.receiptsVoided ? `${overview.receiptsVoided} voided (kept on record)` : "Issued and valid"}
          href="/admin/receipts/all"
        />
        <StatCard label="Fully paid projects" value={overview.fullyPaidProjects} icon={<CheckCircle2 className="h-4 w-4" />} detail="Paid in full (or more)" />
        <StatCard label="Partially paid projects" value={overview.partiallyPaidProjects} icon={<CircleDashed className="h-4 w-4" />} detail="Deposit received, balance owed" />
        <StatCard label="Unpaid projects" value={overview.unpaidProjects} icon={<AlertCircle className="h-4 w-4" />} detail="Price agreed, nothing paid yet" />
        <StatCard
          label="Payments without a receipt"
          value={overview.paymentsWithoutReceipt}
          icon={<FilePlus2 className="h-4 w-4" />}
          detail="Confirmed payments not yet receipted"
          tone={overview.paymentsWithoutReceipt > 0 ? "attention" : "default"}
          href="/admin/receipts/payments?receipt=missing"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel className="min-w-0">
          <PanelHeader
            title="Recent payments"
            description="The latest payments and their receipts."
            action={
              <Link href="/admin/receipts/payments" className="text-xs text-muted hover:text-fg">
                View all →
              </Link>
            }
          />
          {recent.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={<ReceiptText className="h-5 w-5" />} title="No payments yet" description="Generate your first receipt: it records the payment and issues the receipt in one step." action={<Link href="/admin/receipts/new" className={buttonClass("primary", "sm")}>Generate receipt</Link>} />
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Recent payments</caption>
                <thead className="border-b border-line text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium">Date</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Client · project</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Amount</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recent.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap px-5 py-2.5">{p.paidOn}</td>
                      <td className="px-3 py-2.5">
                        <Link href={`/admin/receipts/clients/${p.client.id}`} className="hover:text-accent-bright">
                          {p.client.name}
                        </Link>
                        <span className="block text-xs text-muted">
                          {p.project?.title ?? "—"} · {p.description ?? methodLabel(p.method)}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 text-right font-medium ${p.status === "CONFIRMED" ? "text-emerald-300" : "text-muted line-through"}`}>
                        <Money kobo={p.amountKobo} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5">
                        {p.status !== "CONFIRMED" ? (
                          <StatusPill tone="danger">{PAYMENT_RECORD_STATUS_LABEL[p.status]}</StatusPill>
                        ) : p.receipt ? (
                          <Link href={`/admin/receipts/${p.receipt.id}`} className="font-mono text-xs text-accent-bright hover:underline">
                            {p.receipt.number}
                          </Link>
                        ) : (
                          <Link href={`/admin/receipts/new?payment=${p.id}`} className="text-xs text-amber-300 hover:underline">
                            Issue receipt
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel className="min-w-0">
          <PanelHeader title="Balances owed" description="Active projects with money still to come." />
          {owing.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">Nothing outstanding.</p>
          ) : (
            <ul className="divide-y divide-line">
              {owing.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/receipts/clients/${p.client.id}`} className="block truncate text-sm hover:text-accent-bright">
                      {p.client.name}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {p.title} · paid {formatKobo(p.paidKobo)} of {formatKobo(p.priceKobo)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Money kobo={p.outstandingKobo} className="text-sm font-medium text-amber-300" />
                    <PaymentStatusPill status={p.paymentStatus} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
