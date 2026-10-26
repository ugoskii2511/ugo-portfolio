// Unit tests for the money and business rules. Run with: npm run test
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatKobo, koboToInput, parseNairaToKobo, sumKobo } from "../src/lib/money";
import {
  creditKobo,
  csvCell,
  dateFilter,
  lastMonths,
  outstandingKobo,
  paymentStatus,
  projectFinancials,
  resolveRange,
  timestampFilter,
} from "../src/lib/business-calc";

test("parses naira text into exact kobo", () => {
  assert.equal(parseNairaToKobo("15000"), 1_500_000);
  assert.equal(parseNairaToKobo("₦15,000"), 1_500_000);
  assert.equal(parseNairaToKobo("15,000.5"), 1_500_050);
  assert.equal(parseNairaToKobo("15000.05"), 1_500_005);
  assert.equal(parseNairaToKobo(" 0.10 "), 10);
  assert.equal(parseNairaToKobo("007"), 700);
  for (const bad of ["", "-5", "1.234", "abc", "1e5", "12..3", "₦"]) assert.equal(parseNairaToKobo(bad), null, bad);
  assert.equal(parseNairaToKobo("99999999999999"), null); // over the sanity ceiling
});

test("sums without floating-point drift", () => {
  // 0.1 + 0.2 in floats is 0.30000000000000004; in kobo it's exact.
  const total = sumKobo([parseNairaToKobo("0.10")!, parseNairaToKobo("0.20")!]);
  assert.equal(total, 30);
  assert.equal(formatKobo(total), "₦0.30");
  // The calculator example from the brief: 15,000 + 25,000 + 10,000.
  assert.equal(formatKobo(sumKobo(["15000", "25000", "10000"].map((v) => parseNairaToKobo(v)!))), "₦50,000");
});

test("formats kobo for display and for inputs", () => {
  assert.equal(formatKobo(1_500_000), "₦15,000");
  assert.equal(formatKobo(1_500_050), "₦15,000.50");
  assert.equal(formatKobo(-250_000), "−₦2,500");
  assert.equal(formatKobo(250_000, { signed: true }), "+₦2,500");
  assert.equal(formatKobo(null), "—");
  assert.equal(formatKobo(BigInt(1_500_000)), "₦15,000");
  assert.equal(koboToInput(1_500_050), "15000.50");
  assert.equal(koboToInput(1_500_000), "15000");
});

test("payment status is derived from payments", () => {
  assert.equal(paymentStatus(500_000_00, 0), "UNPAID");
  assert.equal(paymentStatus(500_000_00, 200_000_00), "PARTIAL");
  assert.equal(paymentStatus(500_000_00, 500_000_00), "PAID");
  assert.equal(paymentStatus(500_000_00, 600_000_00), "OVERPAID");
  assert.equal(paymentStatus(null, 100_00), "PARTIAL"); // price not agreed yet
  assert.equal(paymentStatus(null, 0), "UNPAID");
});

test("outstanding balance follows payments and ignores cancelled projects", () => {
  assert.equal(outstandingKobo(500_000_00, 200_000_00, "IN_PROGRESS"), 300_000_00);
  assert.equal(outstandingKobo(500_000_00, 500_000_00, "COMPLETED"), 0);
  assert.equal(outstandingKobo(500_000_00, 650_000_00, "COMPLETED"), 0);
  assert.equal(creditKobo(500_000_00, 650_000_00), 150_000_00);
  assert.equal(outstandingKobo(500_000_00, 100_000_00, "CANCELLED"), 0);
  assert.equal(outstandingKobo(null, 0, "INQUIRY"), 0);
});

test("profit separates estimate from actual cash", () => {
  const f = projectFinancials({ priceKobo: 400_000_00, paidKobo: 150_000_00, maintenanceKobo: 20_000_00, directExpensesKobo: 60_000_00, status: "IN_PROGRESS" });
  assert.equal(f.estimatedProfitKobo, 340_000_00); // price − direct expenses
  assert.equal(f.cashAfterExpensesKobo, 110_000_00); // (150k + 20k) − 60k: unpaid money isn't counted
  assert.equal(f.outstandingKobo, 250_000_00);
  assert.equal(f.paymentStatus, "PARTIAL");
  const unpriced = projectFinancials({ priceKobo: null, paidKobo: 0, maintenanceKobo: 0, directExpensesKobo: 5_000_00, status: "INQUIRY" });
  assert.equal(unpriced.estimatedProfitKobo, null);
  assert.equal(unpriced.cashAfterExpensesKobo, -5_000_00);
});

test("date ranges use Lagos calendar days", () => {
  // 23:30 UTC on 31 Dec is already 1 Jan in Lagos.
  const nye = new Date("2026-12-31T23:30:00Z");
  assert.deepEqual(resolveRange("today", undefined, undefined, nye), { preset: "today", from: "2027-01-01", to: "2027-01-01", label: "Today" });
  assert.equal(resolveRange("year", undefined, undefined, nye).from, "2027-01-01");
  const sat = new Date("2026-10-17T12:00:00Z"); // a Saturday
  assert.equal(resolveRange("week", undefined, undefined, sat).from, "2026-10-12"); // Monday
  assert.equal(resolveRange("month", undefined, undefined, sat).from, "2026-10-01");
  assert.equal(resolveRange("nonsense", undefined, undefined, sat).preset, "month");
  const custom = resolveRange("custom", "2026-10-20", "2026-10-01", sat);
  assert.equal(custom.from, "2026-10-01"); // swapped into order
  assert.equal(custom.to, "2026-10-20");
  assert.equal(resolveRange("custom", "2026-02-30", "2026-03-01", sat).preset, "month"); // invalid date falls back
  assert.equal(resolveRange("all").from, null);
  assert.equal(dateFilter({ from: "2026-10-01", to: "2026-10-31" })!.lte!.toISOString(), "2026-10-31T00:00:00.000Z");
  assert.equal(timestampFilter({ from: "2026-10-01", to: "2026-10-31" })!.lt!.toISOString(), "2026-10-31T23:00:00.000Z");
  assert.deepEqual(lastMonths(3, new Date("2026-01-15T12:00:00Z")), ["2025-11", "2025-12", "2026-01"]);
});

test("CSV cells are escaped and formula-safe", () => {
  assert.equal(csvCell('He said "hi", ok'), '"He said ""hi"", ok"');
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell("-500"), "-500");
  assert.equal(csvCell(null), "");
});
