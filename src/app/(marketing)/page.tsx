import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Hero } from "@/components/home/hero";
import { CapabilityList } from "@/components/home/capabilities";
import { ProcessTimeline } from "@/components/home/process";
import { StackGrid } from "@/components/home/stack-grid";
import { Testimonials } from "@/components/home/testimonials";
import { FinalCta } from "@/components/home/final-cta";
import { ProjectFeature } from "@/components/work/project-feature";
import { SectionIntro } from "@/components/site/section-intro";
import { Wrap } from "@/components/site/wrap";
import { LinkButton } from "@/components/site/button";
import { Reveal } from "@/components/reveal";
import { CAPABILITIES } from "@/lib/capabilities";
import { getShowcaseProjects } from "@/lib/projects";
import { buildVerifiedStack } from "@/lib/stack";
import {
  DEFAULT_ABOUT_BIO,
  DEFAULT_CONTACT_EMAIL,
  DEFAULT_HERO_HEADLINE,
  DEFAULT_HERO_INTRO,
  getSettings,
  getTestimonials,
} from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const HOME_FEATURE_COUNT = 5;

export default async function HomePage() {
  const [projects, settings, processSteps] = await Promise.all([
    getShowcaseProjects(),
    getSettings(),
    prisma.processStep.findMany({ orderBy: { order: "asc" } }),
  ]);
  const reviewsVisible = settings?.reviewsSectionShown ?? true;
  const testimonials = reviewsVisible ? await getTestimonials(projects) : [];

  const featured = projects.slice(0, HOME_FEATURE_COUNT);
  const consoleProjects = projects
    .filter((project) => project.imageUrl)
    .slice(0, 4)
    .map((project) => ({
      slug: project.slug,
      name: project.name,
      category: project.category,
      stack: project.stack,
      domain: project.domain,
      imageUrl: project.imageUrl as string,
    }));
  const projectNames = Object.fromEntries(projects.map((project) => [project.slug, project.name]));
  const { verified, toolkit } = buildVerifiedStack(projects.map((project) => project.stack));
  const bioLead = (settings?.aboutBio ?? DEFAULT_ABOUT_BIO).split(/\n\s*\n/)[0]?.trim();

  return (
    <>
      <Hero
        availabilityStatus={settings?.availabilityStatus ?? "Open for new projects"}
        heroHeadline={settings?.heroHeadline ?? DEFAULT_HERO_HEADLINE}
        heroIntro={settings?.heroIntro ?? DEFAULT_HERO_INTRO}
        consoleProjects={consoleProjects}
      />

      {projects.length > 0 && (
        <div aria-hidden className="marquee-host overflow-hidden border-y border-line py-5">
          <div className="marquee flex w-max gap-12 whitespace-nowrap">
            {[...projects, ...projects].map((project, index) => (
              <span key={`${project.id}-${index}`} className="flex items-center gap-12 text-sm text-faint">
                <span>
                  <span className="text-muted">{project.name}</span>
                  <span className="ml-3 font-mono text-[0.68rem] uppercase tracking-[0.14em]">{project.category}</span>
                </span>
                <span className="text-accent/60">/</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <section aria-labelledby="capabilities-title" className="py-24 sm:py-32">
        <Wrap>
          <SectionIntro
            index="01"
            label="Capabilities"
            title={<span id="capabilities-title">Not just websites. Complete digital products.</span>}
            description="Four kinds of work, one standard: considered design on top of engineering that holds up in production."
          />
          <div className="mt-14 lg:mt-20">
            <CapabilityList capabilities={CAPABILITIES} projectNames={projectNames} />
          </div>
        </Wrap>
      </section>

      {featured.length > 0 && (
        <section id="work" aria-labelledby="work-title" className="scroll-mt-20 pb-24 sm:pb-32">
          <Wrap>
            <SectionIntro
              index="02"
              label="Selected work"
              title={<span id="work-title">Real products, live in production.</span>}
              description="Platforms, stores and sites for real businesses, all live today."
              action={
                <LinkButton href="/work" variant="secondary">
                  All work ({projects.length})
                </LinkButton>
              }
            />
            <div className="mt-14 flex flex-col gap-6 lg:mt-20 lg:gap-10">
              {featured.map((project, index) => (
                <ProjectFeature key={project.id} project={project} index={index} total={featured.length} />
              ))}
            </div>
          </Wrap>
        </section>
      )}

      {processSteps.length > 0 && (
        <section aria-labelledby="process-title" className="border-t border-line py-24 sm:py-32">
          <Wrap>
            <SectionIntro
              index="03"
              label="Process"
              title={<span id="process-title">From first conversation to production.</span>}
              description="A clear path with no black boxes. You always know what's happening, what's next, and why."
            />
            <div className="mt-14 lg:mt-20">
              <ProcessTimeline steps={processSteps} />
            </div>
          </Wrap>
        </section>
      )}

      <section aria-labelledby="about-title" className="border-t border-line py-24 sm:py-32">
        <Wrap className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <Reveal className="lg:col-span-3">
            <p className="label-mono flex items-center gap-3">
              <span className="text-accent-bright">04</span>
              <span aria-hidden className="h-px w-6 bg-line-strong" />
              About
            </p>
          </Reveal>
          <Reveal className="lg:col-span-9">
            <h2 id="about-title" className="display text-balance text-[2.5rem] sm:text-5xl lg:text-6xl">
              Ugochukwu Chukwu Christian.
              <span className="block text-muted">Engineer. Product builder.</span>
            </h2>
            <div className="mt-10 grid gap-10 md:grid-cols-2">
              <p className="text-pretty text-lg leading-relaxed text-fg/85">{bioLead}</p>
              <dl className="grid grid-cols-2 content-start gap-x-6 gap-y-6 border-t border-line pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                {[
                  ["Focus", "Web apps, SaaS & websites"],
                  ["Works", "End to end, solo"],
                  ["Based", "Nigeria"],
                  ["Clients", "Worldwide, remote"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="label-mono">{label}</dt>
                    <dd className="mt-1.5 text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <LinkButton href="/about" variant="secondary" className="mt-10">
              More about me
            </LinkButton>
          </Reveal>
        </Wrap>
      </section>

      <section aria-labelledby="stack-title" className="border-t border-line py-24 sm:py-32">
        <Wrap>
          <SectionIntro
            index="05"
            label="Stack"
            title={<span id="stack-title">Tools with a track record.</span>}
            description="Counted from what's actually running in shipped projects, and in this site."
          />
          <div className="mt-14 lg:mt-20">
            <StackGrid verified={verified} toolkit={toolkit} />
          </div>
        </Wrap>
      </section>

      {testimonials.length > 0 && (
        <section aria-labelledby="reviews-title" className="border-t border-line py-24 sm:py-32">
          <Wrap>
            <SectionIntro
              index="06"
              label="Client words"
              title={<span id="reviews-title">In their words.</span>}
              action={
                <LinkButton href="/reviews" variant="secondary">
                  All reviews
                </LinkButton>
              }
            />
            <div className="mt-14 lg:mt-20">
              <Testimonials reviews={testimonials} />
            </div>
          </Wrap>
        </section>
      )}

      <FinalCta contactEmail={settings?.contactEmail ?? DEFAULT_CONTACT_EMAIL} />
    </>
  );
}
