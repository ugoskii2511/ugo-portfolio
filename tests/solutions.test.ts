// Unit tests for Business Solutions: config integrity, enquiry validation
// and the estimator. Run with: npm run test
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUDGET_OPTIONS, getSolutionByKey, LEAD_STATUSES, SOLUTIONS, TIMELINE_OPTIONS } from "../src/lib/solutions";
import { describeAnswers, parseEnquiry } from "../src/lib/enquiry-schema";
import { estimate } from "../src/lib/solution-estimate";
import { PRICING } from "../src/lib/solution-pricing";

test("six offerings with unique keys, slugs and option values", () => {
  assert.equal(SOLUTIONS.length, 6);
  assert.equal(new Set(SOLUTIONS.map((s) => s.key)).size, 6);
  assert.equal(new Set(SOLUTIONS.map((s) => s.slug)).size, 6);
  for (const s of SOLUTIONS) {
    assert.ok(s.availability.length > 20, `${s.key} states what it honestly is`);
    assert.ok(PRICING[s.key], `${s.key} has a pricing entry`);
    for (const f of s.fields) {
      if (f.type === "multi" || f.type === "select") {
        const values = f.options.map((o) => o.value);
        assert.equal(new Set(values).size, values.length, `${s.key}.${f.key} option values are unique`);
      }
    }
  }
  assert.ok(LEAD_STATUSES.includes("QUOTATION_SENT"));
});

const contact = {
  fullName: "Ada Okafor",
  email: "ada@example.com",
  phone: "0803 123 4567",
  description: "We need a system to track our stock and sales.",
  budget: BUDGET_OPTIONS[1].value,
  timeline: TIMELINE_OPTIONS[2].value,
};

test("valid enquiries parse; answers are checked against the service's own options", () => {
  const ok = parseEnquiry({
    ...contact,
    service: "business-automation",
    answers: { industry: "retail", features: ["inventory-stock-tracking", "reports"], workflow: "Notebook and Excel", unknownKey: "dropped" },
  });
  assert.deepEqual(ok.answers.features, ["inventory-stock-tracking", "reports"]);
  assert.equal("unknownKey" in ok.answers, false);
  assert.throws(() => parseEnquiry({ ...contact, service: "business-automation", answers: { industry: "retail", features: ["hacking"], workflow: "x x" } }));
  assert.throws(() => parseEnquiry({ ...contact, service: "business-automation", answers: { industry: "retail", features: [], workflow: "Notebook" } }), /at least one/);
});

test("conditional required fields per service", () => {
  // Smart cards need card type, quantity and the profile question.
  assert.throws(() => parseEnquiry({ ...contact, service: "smart-business-cards", answers: { cardType: "nfc-card" } }));
  const cards = parseEnquiry({ ...contact, service: "smart-business-cards", answers: { cardType: "qr-nfc", quantity: "50", profile: "yes" } });
  assert.equal(cards.answers.quantity, 50);
  assert.throws(() => parseEnquiry({ ...contact, service: "smart-business-cards", answers: { cardType: "qr-nfc", quantity: "0", profile: "yes" } }));
  // Schools need type, students, modules and challenges.
  assert.throws(() => parseEnquiry({ ...contact, service: "school-management", answers: { schoolType: "secondary" } }));
  // E-commerce needs the store level and product count.
  const shop = parseEnquiry({ ...contact, service: "ecommerce", answers: { storeType: "full-store-with-checkout", productCount: "50-200", payments: ["paystack"] } });
  assert.equal(shop.answers.storeType, "full-store-with-checkout");
});

test("contact validation and unknown services are rejected", () => {
  const answers = { useCases: ["customer-faqs"], intendedUse: "Answer FAQs" };
  assert.throws(() => parseEnquiry({ ...contact, email: "nope", service: "ai-business-assistant", answers }));
  assert.throws(() => parseEnquiry({ ...contact, phone: "abc", service: "ai-business-assistant", answers }));
  assert.throws(() => parseEnquiry({ ...contact, budget: "a million", service: "ai-business-assistant", answers }));
  assert.throws(() => parseEnquiry({ ...contact, service: "free-website-kit", answers }));
});

test("estimator: no invented prices while unpriced, ranges once priced", () => {
  const school = getSolutionByKey("school-management")!;
  const answers = { modules: ["attendance", "results-report-cards", "announcements"] };
  const unpriced = estimate(school, answers);
  assert.equal(unpriced.range, null, "no figure until prices are configured");
  assert.equal(unpriced.modules, 3);
  assert.equal(unpriced.scope, "Small");

  const priced = estimate(school, answers, "standard", { base: 100_000, perModule: 50_000, perIntegration: null, perPhysicalItem: null, perUnit: null });
  // (100k + 3 × 50k) = 250k, ±20% → 200k – 300k
  assert.deepEqual(priced.range, { low: 200_000, high: 300_000 });

  const complex = estimate(school, answers, "complex", { base: 100_000, perModule: 50_000, perIntegration: null, perPhysicalItem: null, perUnit: null });
  assert.ok(complex.range!.low > priced.range!.low, "complexity raises the estimate");

  // A rate that's needed but missing → no figure rather than a wrong one.
  const cards = getSolutionByKey("smart-business-cards")!;
  const partial = estimate(cards, { quantity: 100 }, "standard", { base: 20_000, perModule: null, perIntegration: null, perPhysicalItem: null, perUnit: null });
  assert.equal(partial.range, null);
  assert.ok(partial.factors.includes("Card manufacturing and personalisation"));
});

test("answers are described with readable labels", () => {
  const lines = describeAnswers("ecommerce", { storeType: "whatsapp-ordering-website", payments: ["paystack", "bank-transfer"] });
  assert.deepEqual(lines, [
    { label: "Which level do you need?", value: "WhatsApp ordering website" },
    { label: "Preferred payment methods", value: "Paystack, Bank transfer" },
  ]);
});
