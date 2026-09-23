import type { Metadata } from "next";
import { Wrap } from "@/components/site/wrap";
import { SectionIntro } from "@/components/site/section-intro";
import { Spot } from "@/components/site/spot";
import { Reveal } from "@/components/reveal";
import { ServicesGrid } from "@/components/services-grid";
import { ServicesGuarantees } from "@/components/services-guarantees";
import { FinalCta } from "@/components/home/final-cta";
import { CAPABILITIES } from "@/lib/capabilities";
import { getServiceCategories } from "@/lib/get-service-categories";
import { DEFAULT_CONTACT_EMAIL, getSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Websites, web applications, SaaS platforms and the engineering underneath: auth, databases, APIs, payments and deployment. Book any service directly.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const [categories, settings] = await Promise.all([getServiceCategories(), getSettings()]);

  return (
    <>
      <section className="pb-20 pt-16 sm:pt-24">
        <Wrap>
          <SectionIntro
            headingLevel={1}
            label="Services"
            title="From a landing page to a full platform."
            description="Pick what you need below, or just describe the idea. I'll tell you honestly what it takes, and quote before any work starts."
          />

          <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
            {CAPABILITIES.map((capability, index) => (
              <Reveal as="li" key={capability.title} delay={index * 70}>
                <Spot className="edge flex h-full flex-col rounded-[1.25rem] p-6">
                  <p className="font-mono text-xs text-accent-bright">0{index + 1}</p>
                  <h2 className="mt-8 text-xl font-semibold tracking-tight">{capability.title}</h2>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">{capability.summary}</p>
                </Spot>
              </Reveal>
            ))}
          </ul>

          <div className="mt-6">
            <ServicesGuarantees />
          </div>
        </Wrap>
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="catalogue-title" className="pb-24 sm:pb-32">
          <Wrap>
            <div className="mb-10 flex items-end justify-between gap-6">
              <h2 id="catalogue-title" className="display text-3xl sm:text-4xl">
                Full service catalogue
              </h2>
              <p className="label-mono hidden sm:block">
                {categories.reduce((sum, category) => sum + category.services.length, 0)} services
              </p>
            </div>
            <ServicesGrid categories={categories} />
          </Wrap>
        </section>
      )}

      <FinalCta contactEmail={settings?.contactEmail ?? DEFAULT_CONTACT_EMAIL} />
    </>
  );
}
