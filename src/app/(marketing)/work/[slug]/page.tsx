import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Wrap } from "@/components/site/wrap";
import { Phone } from "@/components/site/phone";
import { LinkButton } from "@/components/site/button";
import { BookButton } from "@/components/site/book-button";
import { StackList } from "@/components/work/stack-list";
import { Testimonials } from "@/components/home/testimonials";
import { FinalCta } from "@/components/home/final-cta";
import { Reveal } from "@/components/reveal";
import { getShowcaseProjects, type ShowcaseProject } from "@/lib/projects";
import { DEFAULT_CONTACT_EMAIL, getSettings, getTestimonials } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

async function findProject(slug: string) {
  const projects = await getShowcaseProjects();
  const index = projects.findIndex((project) => project.slug === slug);
  if (index === -1) return null;
  return { projects, project: projects[index], next: projects[(index + 1) % projects.length] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await findProject(slug);
  if (!found) return { title: "Project not found" };
  const { project } = found;
  const description = `${project.lead} ${project.category} project by Ugochukwu Chukwu Christian.`;
  return {
    title: `${project.name}: ${project.category}`,
    description,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: {
      title: `${project.name} — Case study`,
      description,
      url: `/work/${project.slug}`,
      ...(project.imageUrl ? { images: [{ url: project.imageUrl, alt: `${project.name} on mobile` }] } : {}),
    },
  };
}

function Section({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <Reveal as="section" className="grid gap-4 border-t border-line py-10 md:grid-cols-12 md:gap-10 md:py-14">
      <h2 className="label-mono flex items-center gap-3 self-start md:col-span-4 md:pt-1.5">
        <span className="text-accent-bright">{String(index).padStart(2, "0")}</span>
        <span aria-hidden className="h-px w-6 bg-line-strong" />
        {title}
      </h2>
      <div className="text-pretty text-lg leading-relaxed text-fg/85 md:col-span-8">{children}</div>
    </Reveal>
  );
}

function caseStudySections(project: ShowcaseProject) {
  const { challenge, solution, features, decisions, outcome } = project.caseStudy;
  const sections: { title: string; body: React.ReactNode }[] = [];
  sections.push({
    title: "Overview",
    body: <p className="whitespace-pre-line">{project.summary}</p>,
  });
  if (challenge) sections.push({ title: "The challenge", body: <p>{challenge}</p> });
  if (solution) sections.push({ title: "The solution", body: <p>{solution}</p> });
  if (features?.length) {
    sections.push({
      title: "Key features",
      body: (
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature} className="flex gap-3 text-base">
              <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-accent-bright" />
              {feature}
            </li>
          ))}
        </ul>
      ),
    });
  }
  if (decisions?.length) {
    sections.push({
      title: "Design decisions",
      body: (
        <ul className="space-y-3 text-base">
          {decisions.map((decision) => (
            <li key={decision}>{decision}</li>
          ))}
        </ul>
      ),
    });
  }
  if (project.stack.length) {
    sections.push({ title: "Technology", body: <StackList stack={project.stack} /> });
  }
  if (outcome) sections.push({ title: "Outcome", body: <p>{outcome}</p> });
  return sections;
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const found = await findProject(slug);
  if (!found) notFound();
  const { projects, project, next } = found;

  const settings = await getSettings();
  const reviewsVisible = settings?.reviewsSectionShown ?? true;
  const reviews = reviewsVisible
    ? (await getTestimonials(projects)).filter((review) => review.project?.slug === project.slug)
    : [];
  const sections = caseStudySections(project);
  const isThin = !project.caseStudy.challenge && !project.caseStudy.solution && !project.caseStudy.features;

  const meta: [string, React.ReactNode][] = [
    ["Type", project.category],
    ...(project.caseStudy.role ? ([["Role", project.caseStudy.role]] as [string, React.ReactNode][]) : []),
    ["Status", <span key="s" className="inline-flex items-center gap-2"><span className="live-dot" aria-hidden />Live</span>],
    ...(project.domain && project.liveUrl
      ? ([[
          "Website",
          <a
            key="w"
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-line-strong underline-offset-4 hover:text-accent-bright"
          >
            {project.domain} ↗
          </a>,
        ]] as [string, React.ReactNode][])
      : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.name,
    description: project.lead,
    genre: project.category,
    url: `${SITE_URL}/work/${project.slug}`,
    ...(project.imageUrl ? { image: project.imageUrl } : {}),
    ...(project.liveUrl ? { sameAs: project.liveUrl } : {}),
    creator: { "@id": `${SITE_URL}/#person` },
    keywords: project.stack.join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <article>
        <header className="pb-14 pt-10 sm:pt-14">
          <Wrap>
            <Link
              href="/work"
              className="group inline-flex min-h-11 items-center gap-2 text-sm text-muted transition-colors hover:text-fg"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
              All work
            </Link>
            <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <p className="label-mono reveal-up">{project.category} · Case study</p>
                <h1
                  className="display reveal-up mt-6 text-balance text-[2.9rem] sm:text-7xl lg:text-8xl"
                  style={{ animationDelay: "80ms" }}
                >
                  {project.name}
                </h1>
                <p
                  className="reveal-up mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-muted sm:text-xl"
                  style={{ animationDelay: "160ms" }}
                >
                  {project.lead}
                </p>
              </div>
              <dl
                className="reveal-up grid grid-cols-2 gap-6 border-t border-line pt-6 lg:col-span-4 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
                style={{ animationDelay: "240ms" }}
              >
                {meta.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="label-mono">{label}</dt>
                    <dd className="mt-1.5 break-words text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Wrap>
        </header>

        <Wrap>
          <div
            className="group edge reveal-up relative isolate flex justify-center overflow-hidden rounded-[1.75rem] px-6 pt-14 sm:pt-20"
            style={{ animationDelay: "300ms" }}
          >
            <div aria-hidden className="blueprint-grid absolute inset-0 -z-10" />
            <div
              aria-hidden
              className="accent-glow absolute left-1/2 top-2/3 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2"
            />
            <div className="w-[70%] max-w-[20rem] translate-y-14">
              <Phone
                src={project.imageUrl}
                alt={`${project.name} website on a phone`}
                sizes="(min-width: 640px) 320px, 70vw"
                eager
              />
            </div>
          </div>
        </Wrap>

        <Wrap className="py-16 sm:py-24">
          <div className="mx-auto max-w-5xl">
            {sections.map((section, index) => (
              <Section key={section.title} index={index + 1} title={section.title}>
                {section.body}
              </Section>
            ))}

            {isThin && (
              <Reveal className="mt-4 flex flex-col gap-5 rounded-[1.25rem] border border-dashed border-line-strong p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <p className="text-muted">
                  The full write-up for this project is in progress. Happy to walk you through it on a call.
                </p>
                <BookButton variant="secondary" service="General Inquiry">
                  Ask about it
                </BookButton>
              </Reveal>
            )}

            {reviews.length > 0 && (
              <div className="mt-16">
                <h2 className="label-mono mb-6">From the client</h2>
                <Testimonials reviews={reviews} />
              </div>
            )}

            <div className="mt-16 flex flex-wrap gap-3">
              {project.liveUrl && (
                <LinkButton href={project.liveUrl} arrow="out" aria-label={`Visit ${project.name} (opens in a new tab)`}>
                  Visit the live site
                </LinkButton>
              )}
              <BookButton variant="secondary">Build something similar</BookButton>
            </div>
          </div>
        </Wrap>

        {next && next.slug !== project.slug && (
          <Wrap className="pb-24">
            <Link
              href={`/work/${next.slug}`}
              className="group flex items-end justify-between gap-6 border-t border-line pt-10"
            >
              <div className="min-w-0">
                <p className="label-mono">Next project</p>
                <p className="display mt-4 truncate text-4xl text-fg/60 transition-colors duration-500 group-hover:text-fg sm:text-6xl">
                  {next.name}
                </p>
              </div>
              <span
                aria-hidden
                className="mb-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line-strong transition-all duration-500 group-hover:border-accent group-hover:bg-accent group-hover:text-white"
              >
                →
              </span>
            </Link>
          </Wrap>
        )}
      </article>
      <FinalCta contactEmail={settings?.contactEmail ?? DEFAULT_CONTACT_EMAIL} />
    </>
  );
}
