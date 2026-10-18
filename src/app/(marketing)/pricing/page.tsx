import type { Metadata } from "next";
import { Wrap } from "@/components/site/wrap";
import { SectionIntro } from "@/components/site/section-intro";
import { PricingNotice } from "@/components/work/pricing-notice";
import { CostEstimator } from "@/components/work/cost-estimator";
import { DiscussProjectButton } from "@/components/work/discuss-project";
import { FinalCta } from "@/components/home/final-cta";
import { getPricing } from "@/lib/pricing-server";
import { inquiryOptions } from "@/lib/showcase";
import { formatNaira, formatRange, OTHER_COSTS, PACKAGE_ORDER } from "@/lib/pricing";
import { DEFAULT_CONTACT_EMAIL, getSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Estimated website development prices in naira, from ₦150,000, with domain, hosting, maintenance and other running costs explained. Estimates only; final quotes after a discussion.",
  alternates: { canonical: "/pricing" },
};

function Block({ letter, title, children }: { letter: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`cost-${letter}`} className="rounded-2xl border border-line p-5 sm:p-6">
      <h3 id={`cost-${letter}`} className="flex items-baseline gap-3 font-semibold">
        <span className="font-mono text-sm text-accent-bright">{letter}.</span> {title}
      </h3>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default async function PricingPage() {
  const [pricing, settings] = await Promise.all([getPricing(), getSettings()]);
  const { config } = pricing;
  const inquiry = inquiryOptions(pricing);
  const example = config.packages.business;

  return (
    <>
      <section className="pb-20 pt-16 sm:pb-28 sm:pt-24">
        <Wrap>
          <SectionIntro
            headingLevel={1}
            label="Pricing"
            title="Estimated prices, explained honestly."
            description="Starting estimates for common types of website in Nigeria. Every project is quoted properly after we discuss what you need."
          />

          <PricingNotice text={pricing.disclaimer} className="mt-10" />

          <div className="mt-12 overflow-hidden rounded-[1.25rem] border border-line">
            <table className="w-full text-left text-sm sm:text-base">
              <caption className="sr-only">Estimated development prices by type of website</caption>
              <thead className="border-b border-line bg-white/[0.02] text-xs text-muted sm:text-sm">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium sm:px-6">
                    Website type
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium sm:px-6">
                    Estimated development price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {PACKAGE_ORDER.map((key) => {
                  const p = config.packages[key];
                  return (
                    <tr key={key}>
                      <th scope="row" className="px-4 py-3.5 text-left font-normal sm:px-6">
                        {p.label}
                      </th>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums sm:px-6">
                        {formatRange(p.min, p.max)}
                        {p.max === null && <span className="block text-xs font-normal text-muted">depending on scope</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted">
            These are starting estimates, not fixed quotations. If your project is more complex than a standard package, the price may increase
            after the requirements have been discussed. No development estimate is below {formatNaira(150_000)}.
          </p>

          <h2 className="mt-20 text-3xl font-semibold tracking-tight">What you pay for, and when</h2>
          <p className="mt-3 max-w-3xl text-muted">
            The development price covers building the agreed scope. Running a website has other costs, some yearly and some optional, and
            they&apos;re listed here so you can budget properly.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Block letter="A" title="Website development (one-time)">
              The agreed design and build, based on the scope and features we confirm together. Estimates above.
            </Block>
            <Block letter="B" title={`Domain registration: about ${formatRange(config.domain.min, config.domain.max)} per year`}>
              An illustrative budget for a typical domain. The real cost depends on the extension (.com, .com.ng, .ng…), the registrar and its
              renewal price, and it recurs every year.
            </Block>
            <Block letter="C" title={`Hosting: about ${formatRange(config.hosting.min, config.hosting.max)} per year`}>
              Typical for a small business website, depending on the provider, traffic, resources and what the site needs. Complex applications,
              marketplaces and SaaS platforms may cost more. Some platforms offer free tiers; they can suit small or early sites but have usage
              limits and aren&apos;t always suitable for production.
            </Block>
            <Block letter="D" title="SSL and security">
              HTTPS certificates are often included free by the hosting provider, and you won&apos;t be charged for one when that&apos;s the case.
              Paid security services, advanced protection or other third-party tools are only added if your project needs them, at their cost.
            </Block>
            <Block letter="E" title={`Maintenance: from ${formatNaira(config.maintenanceFrom)} per month (optional)`}>
              Basic maintenance can include agreed updates, backups, security checks, bug fixes and technical support. The scope and frequency are
              defined in writing; more demanding websites cost more. New features, major redesigns, substantial content additions and significant
              functionality changes are quoted separately.
            </Block>
            <Block letter="F" title="Other possible costs, only when relevant">
              <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                {OTHER_COSTS.map((c) => (
                  <li key={c}>· {c}</li>
                ))}
              </ul>
            </Block>
          </div>

          <h2 className="mt-20 text-3xl font-semibold tracking-tight">Example: a first-year budget</h2>
          <p className="mt-3 max-w-3xl text-muted">
            Using the {example.label.toLowerCase()} estimate. Switch items on or off to see how the first-year figure changes; optional maintenance
            is always shown separately.
          </p>
          <div className="mt-8">
            <CostEstimator config={config} estimate={{ label: example.label, min: example.min, max: example.max, complex: false }} />
          </div>

          <div className="mt-12 flex flex-col gap-4 rounded-[1.25rem] border border-accent/30 bg-accent-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="text-lg font-semibold">Ready to get an accurate price?</p>
              <p className="mt-1 text-sm text-muted">Describe your project and I&apos;ll reply with questions and a quotation.</p>
            </div>
            <DiscussProjectButton options={inquiry} size="lg" className="shrink-0">
              Discuss your project
            </DiscussProjectButton>
          </div>

          <PricingNotice text={pricing.disclaimer} className="mt-8" />
        </Wrap>
      </section>
      <FinalCta contactEmail={settings?.contactEmail ?? DEFAULT_CONTACT_EMAIL} />
    </>
  );
}
