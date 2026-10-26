/// Pure receipt rules: numbering, the running payment ledger behind each
/// receipt and the snapshot shape stored with it. No database access here,
/// so every rule is unit-tested (tests/receipts.test.ts).

import { PAYMENT_METHODS, completionPercent, paymentStatus, type PaymentStatus } from "@/lib/business-calc";

export const RECEIPT_PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partially Paid",
  PAID: "Fully Paid",
  OVERPAID: "Overpaid",
};

export const PAYMENT_RECORD_STATUSES = ["CONFIRMED", "FAILED", "CANCELLED", "REVERSED", "REFUNDED"] as const;
export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];
export const PAYMENT_RECORD_STATUS_LABEL: Record<PaymentRecordStatus, string> = {
  CONFIRMED: "Confirmed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REVERSED: "Reversed",
  REFUNDED: "Refunded",
};

/// "RCT" + 2026 + 7 → "RCT-2026-0007". Grows past 4 digits when needed.
export function formatReceiptNumber(prefix: string, year: number, sequence: number): string {
  const clean = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "RCT";
  return `${clean}-${year}-${String(sequence).padStart(4, "0")}`;
}

/// Prefixes are short codes so numbers stay readable and safe in file names.
export function isValidPrefix(prefix: string): boolean {
  return /^[A-Za-z0-9]{1,8}$/.test(prefix);
}

/// Amount in minor units (kobo / cents) with the configured symbol.
export function formatMinor(minor: number, symbol = "₦"): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const whole = Math.trunc(abs / 100);
  const rest = abs % 100;
  return `${negative ? "−" : ""}${symbol}${whole.toLocaleString("en-NG")}${rest ? `.${String(rest).padStart(2, "0")}` : ""}`;
}

export type LedgerPayment = {
  id: string;
  amountKobo: number;
  /// YYYY-MM-DD
  paidOn: string;
  /// ISO timestamp; breaks ties between payments on the same day.
  createdAt: string;
  status: PaymentRecordStatus;
  description: string | null;
};

export type Ledger = {
  /// Confirmed payments up to and including this one, oldest first.
  installments: { id: string; paidOn: string; amountKobo: number; description: string | null; isThis: boolean }[];
  /// 1-based position of this payment among the confirmed ones.
  installmentNumber: number;
  paidBeforeKobo: number;
  thisPaymentKobo: number;
  paidToDateKobo: number;
  outstandingKobo: number;
  creditKobo: number;
  percent: number;
  status: PaymentStatus;
};

function byTime(a: LedgerPayment, b: LedgerPayment) {
  return a.paidOn === b.paidOn ? a.createdAt.localeCompare(b.createdAt) : a.paidOn.localeCompare(b.paidOn);
}

/// The running totals as at a given payment: what had been paid before it,
/// this payment, and the cumulative position after it. Only CONFIRMED
/// payments count. A later receipt never changes an earlier one's figures.
export function ledgerAt(totalKobo: number | null, payments: LedgerPayment[], thisPaymentId: string): Ledger {
  const confirmed = payments.filter((p) => p.status === "CONFIRMED").sort(byTime);
  const index = confirmed.findIndex((p) => p.id === thisPaymentId);
  if (index === -1) throw new Error("Only a confirmed payment can have a receipt.");
  const upTo = confirmed.slice(0, index + 1);
  const thisPaymentKobo = confirmed[index].amountKobo;
  const paidToDateKobo = upTo.reduce((s, p) => s + p.amountKobo, 0);
  return {
    installments: upTo.map((p) => ({ id: p.id, paidOn: p.paidOn, amountKobo: p.amountKobo, description: p.description, isThis: p.id === thisPaymentId })),
    installmentNumber: index + 1,
    paidBeforeKobo: paidToDateKobo - thisPaymentKobo,
    thisPaymentKobo,
    paidToDateKobo,
    outstandingKobo: totalKobo === null ? 0 : Math.max(totalKobo - paidToDateKobo, 0),
    creditKobo: totalKobo === null ? 0 : Math.max(paidToDateKobo - totalKobo, 0),
    percent: completionPercent(totalKobo, paidToDateKobo),
    status: paymentStatus(totalKobo, paidToDateKobo),
  };
}

/// "First deposit", "Second deposit"… when the admin didn't describe it.
export function defaultPaymentDescription(installmentNumber: number, status: PaymentStatus, totalKnown: boolean): string {
  if (totalKnown && (status === "PAID" || status === "OVERPAID")) return installmentNumber === 1 ? "Full payment" : "Final payment";
  const ordinals = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
  return installmentNumber <= ordinals.length ? `${ordinals[installmentNumber - 1]} deposit` : `Payment ${installmentNumber}`;
}

export function methodLabel(method: string): string {
  return PAYMENT_METHODS[method as keyof typeof PAYMENT_METHODS] ?? method;
}

/// Everything printed on a receipt, frozen when it's issued so the receipt
/// never changes afterwards, even if the client, project or settings do.
export type ReceiptSnapshot = {
  version: 1;
  number: string;
  issueDate: string;
  paymentDate: string;
  currency: string;
  currencySymbol: string;
  business: { name: string; logoUrl: string | null; email: string | null; phone: string | null; website: string | null; address: string | null };
  client: { name: string; businessName: string | null; email: string | null; phone: string | null };
  project: {
    title: string;
    description: string | null;
    category: string | null;
    reference: string | null;
    basePriceKobo: number | null;
    additionalChargesKobo: number | null;
    discountKobo: number | null;
    totalKobo: number | null;
  } | null;
  payment: { amountKobo: number; description: string; method: string; methodLabel: string; reference: string | null; kind: "PROJECT" | "MAINTENANCE" };
  totals: {
    paidBeforeKobo: number;
    paidToDateKobo: number;
    outstandingKobo: number;
    creditKobo: number;
    percent: number;
    status: PaymentStatus;
    statusLabel: string;
  };
  installments: Ledger["installments"];
  acknowledgement: string;
  authorizedName: string | null;
  authorizedTitle: string | null;
  footerNote: string | null;
};

export const DEFAULT_ACKNOWLEDGEMENT =
  "Received with thanks. This receipt confirms the payment described above toward the project named. Please keep it for your records.";

/// Safe file name for downloads: "Receipt-RCT-2026-0007.pdf".
export function receiptFileName(number: string): string {
  return `Receipt-${number.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}
