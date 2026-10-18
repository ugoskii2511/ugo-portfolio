import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { PricingEditor } from "@/components/admin/pricing-editor";
import { getPricing } from "@/lib/pricing-server";
import { getSettings } from "@/lib/content";

export const metadata: Metadata = { title: "Pricing" };

export default async function AdminPricingPage() {
  const [pricing, settings] = await Promise.all([getPricing(), getSettings()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Site"
        title="Pricing"
        description="Estimated prices shown on your public site. Each project picks a package (or a custom range) in its project settings."
      />
      <PricingEditor initial={pricing.config} disclaimer={pricing.disclaimer} customDisclaimer={Boolean(settings?.pricingDisclaimer)} />
    </div>
  );
}
