// Database test for receipts: numbering, deposits, duplicates, reversals and
// the safety constraints. Everything runs inside ONE transaction that is
// rolled back at the end, so nothing is left in the database.
// Run with: npm run test:db   (needs DATABASE_URL; set RUN_DB_TESTS=1)
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { BusinessError } from "@/lib/business-api";
import { buildSnapshot, getReceiptSettings, issueReceipt, snapshotOf, voidReceiptsForPayment } from "@/lib/receipts";

class Rollback extends Error {}
const run = process.env.RUN_DB_TESTS === "1";

test("receipts end to end (rolled back)", { skip: !run && "set RUN_DB_TESTS=1" }, async () => {
  const day = (d: string) => new Date(`${d}T00:00:00Z`);
  try {
    await prisma.$transaction(
      async (tx) => {
        const client = await tx.client.create({ data: { name: "QA Receipt Client (rolled back)", email: "qa@example.invalid" } });
        const project = await tx.clientProject.create({ data: { clientId: client.id, title: "QA website", priceKobo: BigInt(250_000_00), status: "IN_PROGRESS", referenceNumber: "QA-1" } });
        const pay = (naira: number, d: string, description?: string) =>
          tx.clientPayment.create({ data: { clientId: client.id, projectId: project.id, amountKobo: BigInt(naira * 100), paidOn: day(d), method: "bank_transfer", description } });

        // First deposit
        const p1 = await pay(100_000, "2026-09-01");
        const r1 = await issueReceipt(tx, p1.id, "qa@test", "2026-09-01");
        const s1 = snapshotOf(r1);
        assert.match(r1.number, /^[A-Z0-9]+-2026-\d{4,}$/);
        assert.equal(s1.totals.paidToDateKobo, 100_000_00);
        assert.equal(s1.totals.outstandingKobo, 150_000_00);
        assert.equal(s1.totals.statusLabel, "Partially Paid");
        assert.equal(s1.payment.description, "First deposit");
        assert.equal(s1.project?.reference, "QA-1");

        // Second deposit: the spec example
        const p2 = await pay(50_000, "2026-10-01");
        const r2 = await issueReceipt(tx, p2.id, "qa@test", "2026-10-01");
        const s2 = snapshotOf(r2);
        assert.equal(s2.totals.paidBeforeKobo, 100_000_00);
        assert.equal(s2.payment.amountKobo, 50_000_00);
        assert.equal(s2.totals.paidToDateKobo, 150_000_00);
        assert.equal(s2.totals.outstandingKobo, 100_000_00);
        assert.equal(s2.totals.statusLabel, "Partially Paid");
        assert.equal(s2.installments.length, 2);
        const n1 = Number(r1.number.split("-").pop());
        const n2 = Number(r2.number.split("-").pop());
        assert.equal(n2, n1 + 1, "numbers are sequential");
        // The first receipt is untouched by the second payment.
        assert.equal(snapshotOf((await tx.receipt.findUnique({ where: { id: r1.id } }))!).totals.paidToDateKobo, 100_000_00);

        // A second receipt for the same payment is refused.
        await assert.rejects(issueReceipt(tx, p2.id, "qa@test", "2026-10-01"), (e) => e instanceof BusinessError && e.status === 409);

        // Reversal: the receipt is voided and the money stops counting.
        await tx.clientPayment.update({ where: { id: p2.id }, data: { status: "REVERSED", statusReason: "QA" } });
        const voided = await voidReceiptsForPayment(tx, p2.id, "QA reversal", "qa@test");
        assert.deepEqual(voided, [r2.number]);
        assert.equal((await tx.receipt.findUnique({ where: { id: r2.id } }))!.status, "VOIDED");
        await assert.rejects(issueReceipt(tx, p2.id, "qa@test", "2026-10-02"), /reversed/);

        // Final payment after the reversal: only confirmed money counts.
        const p3 = await pay(150_000, "2026-10-05", "Final payment");
        const s3 = snapshotOf(await issueReceipt(tx, p3.id, "qa@test", "2026-10-05"));
        assert.equal(s3.totals.paidToDateKobo, 250_000_00);
        assert.equal(s3.totals.outstandingKobo, 0);
        assert.equal(s3.totals.statusLabel, "Fully Paid");
        assert.equal(s3.payment.description, "Final payment");

        // Overpayment
        const p4 = await pay(10_000, "2026-10-06");
        const s4 = await buildSnapshot(tx, p4.id, "2026-10-06", "PREVIEW", await getReceiptSettings(tx));
        assert.equal(s4.totals.status, "OVERPAID");
        assert.equal(s4.totals.creditKobo, 10_000_00);

        // Charges and discount change the agreed total on new receipts.
        await tx.clientProject.update({ where: { id: project.id }, data: { additionalChargesKobo: BigInt(30_000_00), discountKobo: BigInt(10_000_00) } });
        const s5 = await buildSnapshot(tx, p4.id, "2026-10-06", "PREVIEW", await getReceiptSettings(tx));
        assert.equal(s5.project?.totalKobo, 270_000_00);
        assert.equal(s5.totals.paidToDateKobo, 260_000_00);
        assert.equal(s5.totals.outstandingKobo, 10_000_00);
        assert.equal(s5.totals.status, "PARTIAL");

        // Database guard: one issued receipt per payment, even bypassing the app.
        await assert.rejects(
          tx.receipt.create({ data: { number: `QA-DUP-${Date.now()}`, paymentId: p1.id, clientId: client.id, issueDate: day("2026-10-06"), data: {}, createdBy: "qa" } }),
          /Unique constraint|P2002|unique/i
        );
        throw new Rollback();
      },
      { timeout: 120_000, maxWait: 20_000 }
    );
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
  // Nothing was kept.
  assert.equal(await prisma.client.count({ where: { name: "QA Receipt Client (rolled back)" } }), 0);
});

test("negative charges are rejected by the database", { skip: !run && "set RUN_DB_TESTS=1" }, async () => {
  await assert.rejects(
    prisma.$transaction(async (tx) => {
      const client = await tx.client.create({ data: { name: "QA constraint (rolled back)" } });
      await tx.clientProject.create({ data: { clientId: client.id, title: "x", discountKobo: BigInt(-1) } });
    }),
    /ClientProject_discount_nonneg|check constraint/i
  );
  await prisma.$disconnect();
});
