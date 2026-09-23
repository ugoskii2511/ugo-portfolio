import type { Metadata } from "next";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { Wrap } from "@/components/site/wrap";
import { SectionIntro } from "@/components/site/section-intro";
import { LinkButton } from "@/components/site/button";
import { BookButton } from "@/components/site/book-button";
import { Reveal } from "@/components/reveal";
import { StackGrid } from "@/components/home/stack-grid";
import { ProcessTimeline } from "@/components/home/process";
import { FaqSection } from "@/components/about/faq-section";
import { FinalCta } from "@/components/home/final-cta";
import { getShowcaseProjects } from "@/lib/projects";
import { buildVerifiedStack } from "@/lib/stack";
import { DEFAULT_ABOUT_BIO, DEFAULT_CONTACT_EMAIL, getSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Ugochukwu Chukwu Christian is an independent software engineer and digital product builder in Nigeria, designing and building websites, web apps and SaaS products end to end.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  {
    title: "Understand it before building it",
    body: "The first job is the problem, not the code. Goals, users and constraints come before any stack decisions.",
  },
  {
    title: "Talk directly, often",
    body: "You work with the person building your product. Clear updates, no jargon, no account managers.",
  },
  {
    title: "Built to be handed over",
    body: "Clean, structured code you own outright, easy for any engineer to pick up and extend.",
  },
  {
    title: "Security isn't an extra",
    body: "Auth, data and payments are handled carefully from day one, not patched in at the end.",
  },
];

export default async function AboutPage() {
  const [settings, projects, approvedReviews, processSteps, faqs] = await Promise.all([
    getSettings(),
    getShowcaseProjects(),
    prisma.review.findMany({ where: { status: "APPROVED" }, select: { rating: true } }),
    prisma.processStep.findMany({ orderBy: { order: "asc" } }),
    prisma.faqItem.findMany({ orderBy: { order: "asc" } }),
  ]);

  const bioParagraphs = (settings?.aboutBio ?? DEFAULT_ABOUT_BIO)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const { verified, toolkit } = buildVerifiedStack(projects.map((project) => project.stack));

  const reviewsVisible = settings?.reviewsSectionShown ?? true;
  const reviewCount = settings?.clientReviewsOverride ?? approvedReviews.length;
  const computedRating =
    approvedReviews.length > 0
      ? approvedReviews.reduce((sum, review) => sum + review.rating, 0) / approvedReviews.length
      : null;
  const averageRating = settings?.averageRatingOverride ?? computedRating;

  const facts: [string, string][] = [
    ["Live projects", String(projects.length)],
    ...(reviewsVisible && reviewCount > 0 ? ([["Client reviews", String(reviewCount)]] as [string, string][]) : []),
    ...(reviewsVisible && averageRating !== null
      ? ([["Average rating", `${averageRating.toFixed(1)} / 5`]] as [string, string][])
      : []),
  ];

  return (
    <>
      <section className="relative isolate overflow-hidden pb-20 pt-16 sm:pt-24">
        <div aria-hidden className="accent-glow absolute -left-40 top-0 -z-10 h-[34rem] w-[34rem] opacity-60" />
        <Wrap className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p className="label-mono reveal-up">About</p>
            <h1 className="display reveal-up mt-6 text-balance text-[2.9rem] sm:text-7xl" style={{ animationDelay: "80ms" }}>
              Ugochukwu Chukwu Christian
            </h1>
            <p
              className="reveal-up mt-6 max-w-xl text-pretty text-xl leading-relaxed text-muted"
              style={{ animationDelay: "160ms" }}
            >
              Independent software engineer and digital product builder. I turn ideas into software people actually use.
            </p>
          </div>

          <div className="reveal-up lg:col-span-5" style={{ animationDelay: "240ms" }}>
            <div className="edge relative rounded-[1.4rem]">
              <div className="flex items-center gap-4 border-b border-line p-5">
                <Image src="/logo.jpg" alt="Ugochukwu.dev logo" width={48} height={48} className="rounded-xl" />
                <div>
                  <p className="font-medium">Ugochukwu.dev</p>
                  <p className="font-mono text-xs text-faint">{settings?.siteTagline ?? "Software Engineer & Product Builder"}</p>
                </div>
              </div>
              <dl className="divide-y divide-line font-mono text-xs">
                {[
                  ["Based", "Nigeria"],
                  ["Works with", "Founders & businesses, worldwide"],
                  ["Builds", "Websites · web apps · SaaS"],
                  ["Status", settings?.availabilityStatus ?? "Open for new projects"],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 px-5 py-3.5">
                    <dt className="text-faint">{label}</dt>
                    <dd className="text-fg/85">
                      {label === "Status" && <span className="live-dot mr-2 inline-block align-middle" aria-hidden />}
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2 border-t border-line p-5">
                <BookButton>Start a project</BookButton>
                <LinkButton href="/work" variant="secondary">
                  See the work
                </LinkButton>
              </div>
            </div>
          </div>
        </Wrap>
      </section>

      <section aria-labelledby="story-title" className="border-t border-line py-20 sm:py-28">
        <Wrap className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-3">
            <h2 id="story-title" className="label-mono">
              The short version
            </h2>
          </Reveal>
          <Reveal className="space-y-6 lg:col-span-8">
            {bioParagraphs.map((paragraph, index) => (
              <p
                key={index}
                className={
                  index === 0
                    ? "text-pretty text-2xl leading-snug tracking-tight text-fg sm:text-3xl"
                    : "text-pretty text-lg leading-relaxed text-muted"
                }
              >
                {paragraph}
              </p>
            ))}
            {facts.length > 0 && (
              <dl className="!mt-12 grid grid-cols-3 gap-6 border-t border-line pt-8">
                {facts.map(([label, value]) => (
                  <div key={label} className="flex flex-col-reverse">
                    <dt className="label-mono mt-2">{label}</dt>
                    <dd className="display text-3xl sm:text-4xl">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Reveal>
        </Wrap>
      </section>

      <section aria-labelledby="principles-title" className="border-t border-line py-20 sm:py-28">
        <Wrap>
          <SectionIntro index="01" label="Principles" title={<span id="principles-title">How I like to work.</span>} />
          <ul className="mt-14 grid gap-px overflow-hidden rounded-[1.25rem] border border-line bg-line sm:grid-cols-2">
            {PRINCIPLES.map((principle, index) => (
              <Reveal as="li" key={principle.title} delay={index * 60} className="bg-canvas p-7 sm:p-9">
                <p className="font-mono text-xs text-accent-bright">0{index + 1}</p>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">{principle.title}</h3>
                <p className="mt-2 text-pretty leading-relaxed text-muted">{principle.body}</p>
              </Reveal>
            ))}
          </ul>
        </Wrap>
      </section>

      <section aria-labelledby="about-stack-title" className="border-t border-line py-20 sm:py-28">
        <Wrap>
          <SectionIntro
            index="02"
            label="Stack"
            title={<span id="about-stack-title">What I build with.</span>}
            description="Counted from real, shipped projects, plus what this site runs on."
          />
          <div className="mt-14">
            <StackGrid verified={verified} toolkit={toolkit} />
          </div>
        </Wrap>
      </section>

      {processSteps.length > 0 && (
        <section aria-labelledby="about-process-title" className="border-t border-line py-20 sm:py-28">
          <Wrap>
            <SectionIntro index="03" label="Process" title={<span id="about-process-title">What working together looks like.</span>} />
            <div className="mt-14">
              <ProcessTimeline steps={processSteps} />
            </div>
          </Wrap>
        </section>
      )}

      {faqs.length > 0 && (
        <section aria-labelledby="faq-title" className="border-t border-line py-20 sm:py-28">
          <Wrap className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="label-mono flex items-center gap-3">
                <span className="text-accent-bright">04</span>
                <span aria-hidden className="h-px w-6 bg-line-strong" />
                FAQ
              </p>
              <h2 id="faq-title" className="display mt-6 text-4xl sm:text-5xl">
                Questions, answered.
              </h2>
              {reviewsVisible && (
                <LinkButton href="/reviews" variant="secondary" className="mt-8">
                  Read client reviews
                </LinkButton>
              )}
            </div>
            <div className="lg:col-span-8">
              <FaqSection faqs={faqs} />
            </div>
          </Wrap>
        </section>
      )}

      <FinalCta contactEmail={settings?.contactEmail ?? DEFAULT_CONTACT_EMAIL} />
    </>
  );
}
