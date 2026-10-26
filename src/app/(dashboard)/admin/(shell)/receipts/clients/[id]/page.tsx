import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FilePlus2, Mail, Phone } from "lucide-react";
import { prisma } from "@/lib/db";
import { EmptyState, Panel, PanelHeader, StatusPill } from "@/components/admin/ui";
import { Money, PaymentStatusPill, ProjectStatusPill } from "@/components/admin/business/bits";
import { buttonClass } from "@/components/site/button";
import { loadProjects, summariseClient } from "@/lib/business";
import { loadPaymentRecords, loadReceiptRows } from "@/lib/receipts-data";
import { formatMinor, methodLabel, PAYMENT_RECORD_STATUS_LABEL } from "@/lib/receipt-calc";
import { formatKobo } from "@/lib/money";

export const metadata: Metadata = { title: "Client account" };

export default async function ReceiptClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client || client.deletedAt) notFound();
  const [projects, payments, receipts] = await Promise.all([
    loadProjects({ clientId: id, deletedAt: null }),
    loadPaymentRecords({ clientId: id }),
    loadReceiptRows({ clientId: id }),
  ]);
  const summary = summariseClient(client, projects);
  const phone = client.phone ?? client.whatsapp;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link href="/admin/receipts/clients" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Client accounts
          </Link>
          <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]">{client.name}</h1>
          {client.businessName && <p className="text-sm text-muted">{client.businessName}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {client.email && (
              <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 hover:text-fg">
                <Mail className="h-3.5 w-3.5" aria-hidden /> {client.email}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-fg">
                <Phone className="h-3.5 w-3.5" aria-hidden /> {phone}
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/business/clients/${client.id}`} className={buttonClass("secondary", "sm")}>
            Full business profile
          </Link>
          <Link href={`/admin/receipts/new?client=${client.id}`} className={buttonClass("primary", "sm")}>
            <FilePlus2 className="h-4 w-4" aria-hidden /> New receipt
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Total project value", formatKobo(summary.valueKobo), ""],
          ["Total paid", formatKobo(summary.paidKobo), "text-emerald-300"],
          ["Outstanding", formatKobo(summary.outstandingKobo), summary.outstandingKobo > 0 ? "text-amber-300" : ""],
          ["Receipts issued", String(receipts.filter((r) => r.status === "ISSUED").length), ""],
        ].map(([label, value, tone]) => (
          <Panel key={label} as="div" className="p-4">
            <p className="label-mono !text-[0.6rem]">{label}</p>
            <p className={`mt-2 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
          </Panel>
        ))}
      </div>

      <Panel>
        <PanelHeader title="Projects" description="Totals include additional charges and discounts. Only confirmed payments count." />
        {projects.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">No projects yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {projects.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-muted">{[p.serviceType, p.referenceNumber && `Ref: ${p.referenceNumber}`].filter(Boolean).join(" · ") || "—"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ProjectStatusPill status={p.status} />
                    <PaymentStatusPill status={p.paymentStatus} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm sm:justify-end">
                  <div>
                    <p className="text-xs text-faint">Total</p>
                    <Money kobo={p.priceKobo} />
                  </div>
                  <div>
                    <p className="text-xs text-faint">Paid ({p.completionPercent}%)</p>
                    <Money kobo={p.paidKobo} className="text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-xs text-faint">{p.creditKobo > 0 ? "Credit" : "Outstanding"}</p>
                    <Money kobo={p.creditKobo > 0 ? p.creditKobo : p.outstandingKobo} className={p.outstandingKobo > 0 ? "text-amber-300" : ""} />
                  </div>
                  <Link href={`/admin/receipts/new?client=${client.id}&project=${p.id}`} className={buttonClass("secondary", "sm")}>
                    Record next payment
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Receipts" description="Every receipt for this client. Voided ones stay on record." />
        {receipts.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No receipts yet" description="Generate one when this client pays." />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {receipts.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link href={`/admin/receipts/${r.id}`} className="font-mono text-sm text-accent-bright hover:underline">
                    {r.number}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    {r.issueDate} · {r.projectTitle ?? "General payment"} · {r.paymentDescription}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium tabular-nums ${r.status === "VOIDED" ? "text-faint line-through" : "text-emerald-300"}`}>{formatMinor(r.amountKobo, r.currencySymbol)}</span>
                  {r.status === "VOIDED" ? <StatusPill tone="danger">Voided</StatusPill> : <PaymentStatusPill status={r.paymentStatus} />}
                  <a href={`/api/admin/receipts/${r.id}/pdf?download=1`} className="text-muted hover:text-fg" aria-label={`Download ${r.number} as PDF`} title="Download PDF">
                    <Download className="h-4 w-4" aria-hidden />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="All transactions" description="Every payment on record, including failed or refunded ones." />
        {payments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">No payments yet.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <caption className="sr-only">Transactions</caption>
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">Date</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Project · description</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Method</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((p) => (
                  <tr key={p.id} className={p.status === "CONFIRMED" ? "" : "text-faint"}>
                    <td className="whitespace-nowrap px-5 py-2.5">{p.paidOn}</td>
                    <td className="px-3 py-2.5">
                      {p.project?.title ?? "—"}
                      <span className="block text-xs text-muted">{p.description ?? (p.kind === "MAINTENANCE" ? "Hosting / maintenance" : "")}</span>
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2.5 text-right font-medium ${p.status === "CONFIRMED" ? "text-emerald-300" : "line-through"}`}>
                      <Money kobo={p.amountKobo} />
                    </td>
                    <td className="px-3 py-2.5">{methodLabel(p.method)}</td>
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
    </div>
  );
}
