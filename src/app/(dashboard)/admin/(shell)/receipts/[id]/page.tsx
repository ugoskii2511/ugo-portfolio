import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FilePlus2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { StatusPill } from "@/components/admin/ui";
import { buttonClass } from "@/components/site/button";
import { ReceiptDocument } from "@/components/admin/receipts/receipt-document";
import { DownloadPdfButton, PrintButton, ReceiptStatusActions } from "@/components/admin/receipts/receipt-actions";
import { snapshotOf } from "@/lib/receipts";

export const metadata: Metadata = { title: "Receipt", robots: { index: false } };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      payment: { select: { id: true, status: true, deletedAt: true, projectId: true, clientId: true, receipts: { where: { status: "ISSUED" }, select: { id: true, number: true } } } },
    },
  });
  if (!receipt) notFound();
  const r = snapshotOf(receipt);
  const voided = receipt.status === "VOIDED";
  const current = receipt.payment.receipts.find((x) => x.id !== receipt.id);
  const paymentUsable = receipt.payment.status === "CONFIRMED" && !receipt.payment.deletedAt && !current;
  const audit = await prisma.adminAuditLog.findMany({ where: { target: receipt.id }, orderBy: { createdAt: "asc" }, select: { id: true, action: true, actor: true, createdAt: true, details: true } });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link href="/admin/receipts/all" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
            <ArrowLeft className="h-4 w-4" aria-hidden /> All receipts
          </Link>
          <h1 className="mt-2 flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">
            <span className="font-mono">{receipt.number}</span>
            {voided ? <StatusPill tone="danger">Voided</StatusPill> : <StatusPill tone="success">Issued</StatusPill>}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {r.client.name} · {r.project?.title ?? "General payment"} · issued by {receipt.createdBy}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintButton />
          <DownloadPdfButton id={receipt.id} />
          <ReceiptStatusActions id={receipt.id} number={receipt.number} voided={voided} paymentUsable={paymentUsable} />
          {receipt.projectId && (
            <Link href={`/admin/receipts/new?client=${receipt.clientId}&project=${receipt.projectId}`} className={buttonClass("primary", "sm")}>
              <FilePlus2 className="h-4 w-4" aria-hidden /> Next payment
            </Link>
          )}
        </div>
      </div>

      {voided && current && (
        <p className="rounded-xl border border-line bg-raised px-4 py-3 text-sm text-muted print:hidden">
          This payment&apos;s current receipt is{" "}
          <Link href={`/admin/receipts/${current.id}`} className="font-mono text-accent-bright hover:underline">
            {current.number}
          </Link>
          .
        </p>
      )}
      {voided && !current && receipt.payment.status !== "CONFIRMED" && (
        <p className="rounded-xl border border-line bg-raised px-4 py-3 text-sm text-muted print:hidden">The payment is marked {receipt.payment.status.toLowerCase()}, so it can&apos;t have a valid receipt.</p>
      )}

      <ReceiptDocument r={r} voided={voided ? { reason: receipt.voidReason, at: receipt.voidedAt?.toISOString() ?? null } : null} />

      {audit.length > 0 && (
        <section aria-label="History" className="rounded-2xl border border-line bg-raised px-5 py-4 text-sm print:hidden">
          <h2 className="text-sm font-semibold">History</h2>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-muted">
            {audit.map((a) => (
              <li key={a.id}>
                {a.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC · {a.action.replace("receipt.", "")} by {a.actor}
                {a.details && typeof a.details === "object" && "reason" in a.details && a.details.reason ? `: ${String(a.details.reason)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
