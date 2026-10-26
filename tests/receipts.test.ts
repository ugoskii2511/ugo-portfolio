// Unit tests for the receipt rules. Run with: npm run test
import { test } from "node:test";
import assert from "node:assert/strict";
import { agreedTotalKobo, completionPercent } from "../src/lib/business-calc";
import { createReceiptSchema, receiptSettingsSchema } from "../src/lib/business-schemas";
import {
  defaultPaymentDescription,
  formatMinor,
  formatReceiptNumber,
  ledgerAt,
  receiptFileName,
  type LedgerPayment,
} from "../src/lib/receipt-calc";

const pay = (id: string, naira: number, paidOn: string, status: LedgerPayment["status"] = "CONFIRMED", createdAt = `${paidOn}T10:00:00Z`): LedgerPayment => ({
  id,
  amountKobo: naira * 100,
  paidOn,
  createdAt,
  status,
  description: null,
});

test("spec example: ₦250,000 project, ₦100,000 then ₦50,000", () => {
  const total = 250_000_00;
  const payments = [pay("a", 100_000, "2026-09-01"), pay("b", 50_000, "2026-10-01")];
  const first = ledgerAt(total, payments, "a");
  assert.equal(first.paidToDateKobo, 100_000_00);
  assert.equal(first.outstandingKobo, 150_000_00);
  assert.equal(first.status, "PARTIAL");
  assert.equal(first.percent, 40);

  const second = ledgerAt(total, payments, "b");
  assert.equal(second.paidBeforeKobo, 100_000_00);
  assert.equal(second.thisPaymentKobo, 50_000_00);
  assert.equal(second.paidToDateKobo, 150_000_00);
  assert.equal(second.outstandingKobo, 100_000_00);
  assert.equal(second.status, "PARTIAL");
  assert.equal(second.installmentNumber, 2);
  assert.deepEqual(second.installments.map((i) => i.isThis), [false, true]);
});

test("an earlier receipt's figures don't change when later payments arrive", () => {
  const total = 250_000_00;
  const before = ledgerAt(total, [pay("a", 100_000, "2026-09-01")], "a");
  const after = ledgerAt(total, [pay("a", 100_000, "2026-09-01"), pay("b", 150_000, "2026-10-01")], "a");
  assert.deepEqual(after, before);
});

test("fully paid, overpaid and unpaid", () => {
  const total = 250_000_00;
  const full = ledgerAt(total, [pay("a", 100_000, "2026-09-01"), pay("b", 150_000, "2026-10-01")], "b");
  assert.equal(full.status, "PAID");
  assert.equal(full.outstandingKobo, 0);
  assert.equal(full.percent, 100);
  const over = ledgerAt(total, [pay("a", 300_000, "2026-09-01")], "a");
  assert.equal(over.status, "OVERPAID");
  assert.equal(over.creditKobo, 50_000_00);
  assert.equal(over.outstandingKobo, 0);
});

test("failed, cancelled, reversed and refunded payments never count", () => {
  const payments = [
    pay("a", 100_000, "2026-09-01"),
    pay("x", 100_000, "2026-09-02", "REVERSED"),
    pay("y", 20_000, "2026-09-03", "FAILED"),
    pay("z", 20_000, "2026-09-04", "REFUNDED"),
    pay("w", 20_000, "2026-09-05", "CANCELLED"),
    pay("b", 50_000, "2026-10-01"),
  ];
  const l = ledgerAt(250_000_00, payments, "b");
  assert.equal(l.paidToDateKobo, 150_000_00);
  assert.equal(l.installments.length, 2);
  assert.throws(() => ledgerAt(250_000_00, payments, "x"), /confirmed/);
});

test("same-day payments are ordered by when they were recorded", () => {
  const payments = [pay("late", 10_000, "2026-09-01", "CONFIRMED", "2026-09-01T15:00:00Z"), pay("early", 20_000, "2026-09-01", "CONFIRMED", "2026-09-01T09:00:00Z")];
  assert.equal(ledgerAt(100_000_00, payments, "late").paidBeforeKobo, 20_000_00);
});

test("agreed total includes charges and discount", () => {
  assert.equal(agreedTotalKobo(250_000_00, 20_000_00, 10_000_00), 260_000_00);
  assert.equal(agreedTotalKobo(250_000_00, null, null), 250_000_00);
  assert.equal(agreedTotalKobo(null, 5_000_00, 0), null);
  assert.equal(agreedTotalKobo(10_000_00, 0, 50_000_00), 0);
  assert.equal(completionPercent(300_000_00, 100_000_00), 33.3);
  assert.equal(completionPercent(null, 0), 0);
});

test("receipt numbers and file names", () => {
  assert.equal(formatReceiptNumber("rct", 2026, 7), "RCT-2026-0007");
  assert.equal(formatReceiptNumber("RCT", 2026, 12345), "RCT-2026-12345");
  assert.equal(formatReceiptNumber("", 2026, 1), "RCT-2026-0001");
  assert.equal(receiptFileName("RCT-2026-0007"), "Receipt-RCT-2026-0007.pdf");
  assert.equal(formatMinor(150_000_00), "₦150,000");
  assert.equal(formatMinor(150_000_50, "$"), "$150,000.50");
});

test("default payment descriptions", () => {
  assert.equal(defaultPaymentDescription(1, "PARTIAL", true), "First deposit");
  assert.equal(defaultPaymentDescription(2, "PARTIAL", true), "Second deposit");
  assert.equal(defaultPaymentDescription(3, "PAID", true), "Final payment");
  assert.equal(defaultPaymentDescription(1, "PAID", true), "Full payment");
});

const base = {
  clientRequestId: "6f1c1a9e-2b1f-4d0e-9a51-3b8f2a1c0d11",
  issueDate: "2026-10-20",
  clientId: "c1",
  projectId: "p1",
  payment: { kind: "PROJECT", amount: "100,000", paidOn: "2026-10-19", method: "bank_transfer" },
};

test("receipt request validation", () => {
  const ok = createReceiptSchema.parse(base);
  assert.equal(ok.payment!.amount, 100_000_00);
  assert.equal(createReceiptSchema.safeParse({ ...base, payment: { ...base.payment, amount: "0" } }).success, false);
  assert.equal(createReceiptSchema.safeParse({ ...base, payment: { ...base.payment, amount: "-5" } }).success, false);
  assert.equal(createReceiptSchema.safeParse({ ...base, payment: { ...base.payment, amount: "abc" } }).success, false);
  assert.equal(createReceiptSchema.safeParse({ ...base, payment: { ...base.payment, method: "crypto" } }).success, false);
  assert.equal(createReceiptSchema.safeParse({ ...base, issueDate: "2026-10-18" }).success, false, "issue before payment");
  assert.equal(createReceiptSchema.safeParse({ ...base, clientId: undefined }).success, false, "no client");
  assert.equal(createReceiptSchema.safeParse({ ...base, newClient: { name: "X" } }).success, false, "both client kinds");
  assert.equal(createReceiptSchema.safeParse({ ...base, clientRequestId: "nope" }).success, false);
  assert.equal(createReceiptSchema.safeParse({ clientRequestId: base.clientRequestId, issueDate: base.issueDate, paymentId: "pay1" }).success, true);
  const bad = createReceiptSchema.safeParse({ ...base, projectId: undefined, newProject: { title: "Site", price: "1000", discount: "5000", status: "IN_PROGRESS" } });
  assert.equal(bad.success, false, "discount above price");
});

test("receipt settings validation", () => {
  assert.equal(receiptSettingsSchema.parse({ numberPrefix: "inv" }).numberPrefix, "INV");
  assert.equal(receiptSettingsSchema.safeParse({ numberPrefix: "RCT-1" }).success, false);
  assert.equal(receiptSettingsSchema.safeParse({ logoUrl: "javascript:alert(1)" }).success, false);
  assert.equal(receiptSettingsSchema.safeParse({ logoUrl: "http://insecure.example/logo.png" }).success, false);
  assert.equal(receiptSettingsSchema.safeParse({ logoUrl: "/logo.jpg" }).success, true);
  assert.equal(receiptSettingsSchema.safeParse({ currency: "naira" }).success, false);
});
