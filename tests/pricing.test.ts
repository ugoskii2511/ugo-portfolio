import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRICING,
  firstYearBudget,
  formatRange,
  formatRangeShort,
  mergePricing,
  PACKAGE_ORDER,
  PRICE_FLOOR,
  projectEstimate,
  validatePricingConfig,
} from "../src/lib/pricing";

test("every default package starts at or above the ₦150,000 floor", () => {
  for (const key of PACKAGE_ORDER) {
    const p = DEFAULT_PRICING.packages[key];
    assert.ok(p.min >= PRICE_FLOOR, `${key} min ${p.min}`);
    if (p.max !== null) assert.ok(p.max >= p.min, `${key} range order`);
  }
  assert.deepEqual(validatePricingConfig(DEFAULT_PRICING), []);
});

test("brief's price table is used exactly", () => {
  const p = DEFAULT_PRICING.packages;
  assert.equal(formatRange(p.business.min, p.business.max), "₦150,000–₦250,000");
  assert.equal(formatRange(p.ecommerce.min, p.ecommerce.max), "₦250,000–₦500,000");
  assert.equal(formatRange(p.webapp.min, p.webapp.max), "From ₦400,000");
  assert.equal(formatRange(p.marketplace.min, p.marketplace.max), "From ₦500,000");
  assert.equal(formatRangeShort(150_000, 250_000), "₦150k–₦250k");
});

test("admin can't save a package below the floor", () => {
  const bad = structuredClone(DEFAULT_PRICING);
  bad.packages.landing.min = 120_000;
  bad.packages.school.max = 100_000;
  const problems = validatePricingConfig(bad);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /can't be below ₦150,000/);
});

test("project estimates: package, custom, floor clamp, none", () => {
  assert.deepEqual(projectEstimate(DEFAULT_PRICING, { pricingPackage: "school" })?.min, 200_000);
  const custom = projectEstimate(DEFAULT_PRICING, { pricingPackage: "business", priceMinNaira: 100_000, priceMaxNaira: 120_000 })!;
  assert.equal(custom.min, PRICE_FLOOR); // clamped up to the floor
  assert.equal(custom.max, PRICE_FLOOR); // and the max can't sit below the min
  assert.equal(custom.custom, true);
  assert.equal(projectEstimate(DEFAULT_PRICING, { pricingPackage: "webapp" })?.max, null);
  assert.equal(projectEstimate(DEFAULT_PRICING, {}), null);
  assert.equal(projectEstimate(DEFAULT_PRICING, { pricingPackage: "nonsense" }), null);
});

test("first-year budget keeps one-time, recurring and optional costs apart", () => {
  const dev = { min: 150_000, max: 250_000 };
  const b = firstYearBudget(DEFAULT_PRICING, dev, { domain: true, hosting: true, maintenance: false });
  assert.deepEqual(b.operatingFirstYear, { min: 45_000, max: 155_000 }); // 15k+30k, 35k+120k
  assert.deepEqual(b.firstYearTotal, { min: 195_000, max: 405_000 });
  assert.equal(b.maintenanceYear, null);
  assert.equal(b.firstYearWithMaintenance, null);

  const withMaint = firstYearBudget(DEFAULT_PRICING, dev, { domain: true, hosting: true, maintenance: true });
  assert.deepEqual(withMaint.firstYearTotal, b.firstYearTotal); // optional never enters the main total
  assert.deepEqual(withMaint.maintenanceYear, { min: 180_000, max: null }); // 15k × 12
  assert.deepEqual(withMaint.firstYearWithMaintenance, { min: 375_000, max: null });

  const noHosting = firstYearBudget(DEFAULT_PRICING, dev, { domain: true, hosting: false, maintenance: false });
  assert.deepEqual(noHosting.firstYearTotal, { min: 165_000, max: 285_000 });

  const open = firstYearBudget(DEFAULT_PRICING, { min: 400_000, max: null }, { domain: true, hosting: true, maintenance: false });
  assert.deepEqual(open.firstYearTotal, { min: 445_000, max: null });
});

test("stored config merges over defaults", () => {
  const merged = mergePricing({ packages: { business: { label: "Business site", min: 160_000, max: 260_000 } }, maintenanceFrom: 20_000, junk: true });
  assert.equal(merged.packages.business.min, 160_000);
  assert.equal(merged.packages.school.min, 200_000);
  assert.equal(merged.maintenanceFrom, 20_000);
  assert.equal(merged.packages.webapp.complex, true);
  assert.deepEqual(mergePricing(null), DEFAULT_PRICING);
});
