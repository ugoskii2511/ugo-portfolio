import "server-only";
import type { InquiryOptions } from "@/components/work/discuss-project";
import type { WorkCardData } from "@/components/work/work-grid";
import type { ShowcaseProject } from "@/lib/projects";
import type { Pricing } from "@/lib/pricing-server";
import { PACKAGE_GROUP, PACKAGE_ORDER, projectEstimate } from "@/lib/pricing";

/// Plain data for the client-side /work grid.
export function toWorkCards(projects: ShowcaseProject[], pricing: Pricing): WorkCardData[] {
  return projects.map((p) => {
    const estimate = projectEstimate(pricing.config, p.pricing);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      lead: p.lead,
      imageUrl: p.imageUrl,
      liveUrl: p.liveUrl,
      features: p.caseStudy.features ?? [],
      stack: p.stack,
      sale: p.sale,
      group: estimate?.packageKey ? PACKAGE_GROUP[estimate.packageKey] : null,
      estimate: estimate ? { label: estimate.label, min: estimate.min, max: estimate.max } : null,
    };
  });
}

export function inquiryOptions(pricing: Pricing): InquiryOptions {
  return { websiteTypes: PACKAGE_ORDER.map((key) => pricing.config.packages[key].label), disclaimer: pricing.disclaimer };
}
