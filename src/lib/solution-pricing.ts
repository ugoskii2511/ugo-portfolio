/// Project estimator pricing rules, in whole naira. Edit the numbers here;
/// nothing else needs to change. This file is public (it runs in the
/// browser), so never put secrets in it.
///
/// A value of null means "not priced yet": the estimator then shows the
/// scope and cost factors without a figure, and says the price is confirmed
/// at consultation. Set a number to switch figures on for that service.
///
/// How a figure is worked out:
///   (base + modules × perModule + integrations × perIntegration)
///     × complexity multiplier
///   + physical items × perPhysicalItem + quantity × perUnit
/// shown as a range of ± spread around that figure.

export type ServicePricing = {
  base: number | null;
  perModule: number | null;
  perIntegration: number | null;
  /// Each printed / physical item type chosen (cards, brochures, labels…).
  perPhysicalItem: number | null;
  /// Per unit of the service's quantity field (e.g. each smart card).
  perUnit: number | null;
};

export const COMPLEXITY = {
  standard: { label: "Standard", multiplier: 1 },
  advanced: { label: "Advanced (custom workflows, more users)", multiplier: 1.35 },
  complex: { label: "Complex (integrations, many roles, large data)", multiplier: 1.75 },
} as const;
export type Complexity = keyof typeof COMPLEXITY;

/// ± share of the figure shown as the range (0.2 = ±20%).
export const RANGE_SPREAD = 0.2;

const UNPRICED: ServicePricing = { base: null, perModule: null, perIntegration: null, perPhysicalItem: null, perUnit: null };

export const PRICING: Record<string, ServicePricing> = {
  "business-in-a-box": { ...UNPRICED },
  "business-automation": { ...UNPRICED },
  "smart-business-cards": { ...UNPRICED },
  "ai-business-assistant": { ...UNPRICED },
  "school-management": { ...UNPRICED },
  ecommerce: { ...UNPRICED },
};

export const ESTIMATE_DISCLAIMER =
  "Your estimate is an initial guide. Final pricing depends on the project scope, technical requirements, integrations, and agreed deliverables.";
