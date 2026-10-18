import type { Metadata } from "next";
import Link from "next/link";
import { Wrap } from "@/components/site/wrap";
import { SectionIntro } from "@/components/site/section-intro";
import { WorkGrid } from "@/components/work/work-grid";
import { PricingNotice } from "@/components/work/pricing-notice";
import { DiscussProjectButton } from "@/components/work/discuss-project";
import { FinalCta } from "@/components/home/final-cta";
import { getShowcaseProjects } from "@/lib/projects";
import { getPricing } from "@/lib/pricing-server";
import { inquiryOptions, toWorkCards } from "@/lib/showcase";
import { DEFAULT_CONTACT_EMAIL, getSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected work by Ugochukwu Chukwu Christian: fintech and VTU platforms, e-commerce stores, and websites for schools, agencies and businesses, all live in production. Includes estimated prices for similar projects.",
  alternates: { canonical: "/work" },
};

export default async function WorkPage() {
  const [projects, settings, pricing] = await Promise.all([getShowcaseProjects(), getSettings(), getPricing()]);
  const inquiry = inquiryOptions(pricing);

  return (
    <>
      <section className="pb-24 pt-16 sm:pb-32 sm:pt-24">
        <Wrap>
          <SectionIntro
            headingLevel={1}
            label="Work"
            title="Everything here is live, and in use."
            description="Platforms, stores and websites built for real businesses. Open any project for the story behind it, the features, and what a similar project would cost."
          />

          {projects.length === 0 ? (
            <p className="mt-20 text-muted">New work is on the way. Check back shortly.</p>
          ) : (
            <WorkGrid projects={toWorkCards(projects, pricing)} inquiry={inquiry} />
          )}

          <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
            <div className="edge rounded-[1.25rem] p-6 sm:p-8">
              <p className="label-mono">Pricing</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">What does a website cost?</h2>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-muted">
                Development estimates start from ₦150,000. Domain, hosting and maintenance are separate, and are explained
                plainly so there are no surprises.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/pricing" className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 text-sm font-medium transition hover:border-fg">
                  See all estimates
                </Link>
                <DiscussProjectButton options={inquiry} variant="primary">
                  Discuss your project
                </DiscussProjectButton>
              </div>
            </div>
            <PricingNotice text={pricing.disclaimer} />
          </div>
        </Wrap>
      </section>
      <FinalCta contactEmail={settings?.contactEmail ?? DEFAULT_CONTACT_EMAIL} />
    </>
  );
}
