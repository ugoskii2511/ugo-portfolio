import "server-only";
import { cache } from "react";
import { getSettings } from "@/lib/content";
import { DEFAULT_DISCLAIMER, mergePricing, type PricingConfig } from "@/lib/pricing";

export type Pricing = { config: PricingConfig; disclaimer: string };

/// Pricing as configured on Admin → Pricing, over the built-in defaults.
export const getPricing = cache(async (): Promise<Pricing> => {
  const settings = await getSettings();
  return {
    config: mergePricing(settings?.pricingConfig),
    disclaimer: settings?.pricingDisclaimer?.trim() || DEFAULT_DISCLAIMER,
  };
});
