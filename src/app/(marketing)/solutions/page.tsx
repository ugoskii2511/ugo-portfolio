import type { Metadata } from "next";
import { Wrap } from "@/components/site/wrap";
import { SectionIntro } from "@/components/site/section-intro";
import { LinkButton } from "@/components/site/button";
import { EnquiryForm } from "@/components/solutions/enquiry-form";
import { ProcessSteps, SolutionCard, WhyList } from "@/components/solutions/sections";
import { SOLUTIONS } from "@/lib/solutions";

export const metadata: Metadata = {
  title: "Business Solutions",
  description:
    "Business websites and digital setup, custom automation software, smart digital business cards, AI business assistants, school management systems and online stores, built around your business.",
  alternates: { canonical: "/solutions" },
};

export default function SolutionsPage() {
  return (
    <>
      <section className="pb-16 pt-16 sm:pt-24">
        <Wrap>
          <SectionIntro
            headingLevel={1}
            label="Business Solutions"
            title="More than websites. Complete digital solutions for growing businesses."
            description="From custom software and intelligent automation to digital business infrastructure, I help businesses work smarter, serve customers better and grow with technology."
            action={
              <div className="flex flex-wrap gap-3">
                <LinkButton href="#enquire">Get an estimate</LinkButton>
                <LinkButton href="/work" variant="secondary">
                  See real projects
                </LinkButton>
              </div>
            }
          />
          <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
            {SOLUTIONS.map((solution, index) => (
              <SolutionCard key={solution.key} solution={solution} index={index} />
            ))}
          </ul>
          <p className="mt-6 max-w-3xl text-sm text-muted">
            Each solution is designed and built for the business that orders it: these are services shaped to your requirements, not
            ready-made products. Each page explains what&apos;s included and what&apos;s quoted separately.
          </p>
        </Wrap>
      </section>

      <section aria-labelledby="process-title" className="border-t border-line py-20 sm:py-24">
        <Wrap>
          <SectionIntro label="How it works" title={<span id="process-title">From first message to launch.</span>} />
          <div className="mt-12">
            <ProcessSteps />
          </div>
        </Wrap>
      </section>

      <section aria-labelledby="why-title" className="border-t border-line py-20 sm:py-24">
        <Wrap>
          <SectionIntro label="Why work with me" title={<span id="why-title">What you can count on.</span>} />
          <div className="mt-12">
            <WhyList />
          </div>
        </Wrap>
      </section>

      <section id="enquire" aria-labelledby="enquire-title" className="scroll-mt-20 border-t border-line py-20 sm:py-24">
        <Wrap>
          <SectionIntro
            label="Enquiry & estimate"
            title={<span id="enquire-title">Tell me what you need.</span>}
            description="Choose a solution, pick the features you need and see your scope take shape. I reply by email or WhatsApp, usually the same day."
          />
          <div className="mt-12">
            <EnquiryForm />
          </div>
        </Wrap>
      </section>
    </>
  );
}
