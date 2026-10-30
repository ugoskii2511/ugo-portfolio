/// Pure estimator: turns an enquiry's answers into a scope summary and, when
/// the service is priced in solution-pricing.ts, a naira range. Used by the
/// form (live) and the server (stored with the enquiry), so both always agree.

import type { Solution } from "@/lib/solutions";
import { COMPLEXITY, PRICING, RANGE_SPREAD, type Complexity, type ServicePricing } from "@/lib/solution-pricing";

export type Answers = Record<string, string | string[] | number | null | undefined>;

export type Estimate = {
  modules: number;
  integrations: number;
  physicalItems: number;
  quantity: number;
  complexity: Complexity;
  /// "Small" / "Medium" / "Large" scope, independent of prices.
  scope: "Small" | "Medium" | "Large";
  /// Null when the service isn't priced (or a needed rate is missing).
  range: { low: number; high: number } | null;
  /// Costs outside the build that apply to this selection.
  factors: string[];
};

const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);

/// Rounded to the nearest ₦5,000 so ranges don't look falsely precise.
const round = (n: number) => Math.max(0, Math.round(n / 5000) * 5000);

export function estimate(solution: Solution, answers: Answers, complexity: Complexity = "standard", pricing: ServicePricing = PRICING[solution.key]): Estimate {
  let modules = 0;
  let integrations = 0;
  let physicalItems = 0;
  let quantity = 0;
  for (const field of solution.fields) {
    const value = answers[field.key];
    if (field.type === "multi") {
      if (field.weight === "module") modules += count(value);
      else if (field.weight === "integration") integrations += count(value);
      else if (field.weight === "physical") physicalItems += count(value);
    }
    if (field.type === "number" && (field.key === "quantity" || field.key === "printQuantity")) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) quantity = n;
    }
  }

  const points = modules + integrations * 1.5 + physicalItems * 0.5;
  const weighted = points * COMPLEXITY[complexity].multiplier;
  const scope = weighted <= 3 ? "Small" : weighted <= 7 ? "Medium" : "Large";

  const factors: string[] = [];
  if (physicalItems > 0 || quantity > 0) factors.push("Printing, production and delivery");
  if (integrations > 0) factors.push("Third-party services and their fees");
  factors.push("Hosting and domain");
  if (solution.key === "ai-business-assistant") factors.push("AI provider usage charges");
  if (solution.key === "smart-business-cards") factors.push("Card manufacturing and personalisation");

  let range: Estimate["range"] = null;
  const p = pricing;
  const need = (rate: number | null, used: number) => used === 0 || rate !== null;
  if (
    p &&
    p.base !== null &&
    need(p.perModule, modules) &&
    need(p.perIntegration, integrations) &&
    need(p.perPhysicalItem, physicalItems) &&
    need(p.perUnit, quantity)
  ) {
    const build = (p.base + modules * (p.perModule ?? 0) + integrations * (p.perIntegration ?? 0)) * COMPLEXITY[complexity].multiplier;
    const extras = physicalItems * (p.perPhysicalItem ?? 0) + quantity * (p.perUnit ?? 0);
    const mid = build + extras;
    range = { low: round(mid * (1 - RANGE_SPREAD)), high: round(mid * (1 + RANGE_SPREAD)) };
  }

  return { modules, integrations, physicalItems, quantity, complexity, scope, range, factors };
}

export function formatNaira(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}
