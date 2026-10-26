import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ReceiptForm, type ExistingPayment } from "@/components/admin/receipts/receipt-form";
import { dayString } from "@/lib/business-calc";
import { toKoboNumber } from "@/lib/money";
import { getReceiptSettings } from "@/lib/receipts";
import { receiptFormClients } from "@/lib/receipts-data";
import { methodLabel } from "@/lib/receipt-calc";

export const metadata: Metadata = { title: "Generate receipt" };

type Search = { client?: string; project?: string; payment?: string };

export default async function NewReceiptPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const [clients, settings, payment] = await Promise.all([
    receiptFormClients(),
    getReceiptSettings(),
    params.payment
      ? prisma.clientPayment.findFirst({
          where: { id: params.payment, deletedAt: null, status: "CONFIRMED" },
          include: { client: { select: { name: true } }, project: { select: { title: true } }, receipts: { where: { status: "ISSUED" }, select: { id: true, number: true } } },
        })
      : Promise.resolve(null),
  ]);

  let existing: ExistingPayment | undefined;
  if (payment && payment.receipts.length === 0) {
    existing = {
      id: payment.id,
      clientName: payment.client.name,
      projectTitle: payment.project?.title ?? null,
      amountKobo: toKoboNumber(payment.amountKobo),
      paidOn: dayString(payment.paidOn)!,
      methodLabel: methodLabel(payment.method),
      description: payment.description,
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Receipts & Payments"
        title={existing ? "Issue a receipt" : "Generate a receipt"}
        description={
          existing
            ? "This payment is already recorded. Preview the receipt, then issue it."
            : "Records the payment and issues its receipt in one step. Totals, outstanding balance and status are calculated for you from every payment on the project."
        }
      />
      {payment && payment.receipts[0] && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          That payment already has receipt{" "}
          <Link href={`/admin/receipts/${payment.receipts[0].id}`} className="font-mono underline">
            {payment.receipts[0].number}
          </Link>
          . To record a new payment, use the form below.
        </p>
      )}
      {params.payment && !payment && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">That payment wasn&apos;t found, or it isn&apos;t confirmed.</p>
      )}
      <ReceiptForm
        clients={clients}
        business={{ businessName: settings.businessName, email: settings.email, phone: settings.phone, website: settings.website, address: settings.address, currencySymbol: settings.currencySymbol }}
        initialClientId={params.client}
        initialProjectId={params.project}
        existingPayment={existing}
      />
    </div>
  );
}
