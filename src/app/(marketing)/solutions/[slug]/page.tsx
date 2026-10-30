import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Info } from "lucide-react";
import { Wrap } from "@/components/site/wrap";
import { LinkButton } from "@/components/site/button";
import { Reveal } from "@/components/reveal";
import { EnquiryForm } from "@/components/solutions/enquiry-form";
import { ProcessSteps } from "@/components/solutions/sections";
import { SolutionIcon } from "@/components/solutions/solution-icon";
import { getShowcaseProjects } from "@/lib/projects";
import { getSolution, SOLUTIONS } from "@/lib/solutions";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SOLUTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const solution = getSolution(slug);
  if (!solution) return {};
  return {
    title: `${solution.name}: ${solution.headline.replace(/\.$/, "")}`,
    description: solution.description,
    alternates: { canonical: `/solutions/${solution.slug}` },
  };
}

/// Example exchange for the AI assistant page. Clearly labelled as an
/// illustration: there is no live AI on this site.
const AI_EXAMPLE = [
  { from: "Customer", text: "Do you deliver to Lekki, and how long does it take?" },
  { from: "Assistant (draft)", text: "Yes, we deliver to Lekki. Orders placed before 2pm usually arrive the next working day. Would you like me to start an order for you?" },
  { from: "Staff", text: "Approved and sent." },
];

export default async function SolutionPage({ params }: Props) {
  const { slug } = await params;
  const solution = getSolution(slug);
  if (!solution) notFound();

  const projects = solution.related?.length ? await getShowcaseProjects().catch(() => []) : [];
  const related = (solution.related ?? [])
    .map((r) => ({ ...r, project: projects.find((p) => p.slug === r.slug) }))
    .filter((r) => r.project);

  return (
    <article>
      <header className="pb-14 pt-10 sm:pt-14">
        <Wrap>
          <Link href="/solutions" className="group inline-flex min-h-11 items-center gap-2 text-sm text-muted transition-colors hover:text-fg">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
            All business solutions
          </Link>
          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="label-mono reveal-up flex items-center gap-3">
                <SolutionIcon icon={solution.icon} className="h-4 w-4 text-accent-bright" />
                {solution.name}
              </p>
              <h1 className="display reveal-up mt-6 text-balance text-[2.6rem] sm:text-6xl lg:text-7xl" style={{ animationDelay: "80ms" }}>
                {solution.headline}
              </h1>
              <p className="reveal-up mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-muted sm:text-xl" style={{ animationDelay: "160ms" }}>
                {solution.description}
              </p>
              <div className="reveal-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: "200ms" }}>
                <LinkButton href="#enquire">{solution.cta}</LinkButton>
                <LinkButton href="/solutions" variant="secondary">
                  Other solutions
                </LinkButton>
              </div>
            </div>
            <div className="reveal-up lg:col-span-4" style={{ animationDelay: "240ms" }}>
              <div role="note" className="flex gap-3 rounded-2xl border border-line-strong bg-white/[0.02] p-5 text-sm leading-relaxed">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright" aria-hidden />
                <p>
                  <span className="font-medium">What this is. </span>
                  <span className="text-muted">{solution.availability}</span>
                </p>
              </div>
            </div>
          </div>
        </Wrap>
      </header>

      <section aria-labelledby="benefits-title" className="border-t border-line py-16 sm:py-20">
        <Wrap className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h2 id="benefits-title" className="display text-3xl sm:text-4xl">
              What it does for you
            </h2>
          </Reveal>
          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
            {solution.benefits.map((b) => (
              <li key={b} className="flex gap-3 border-t border-line pt-4 text-[0.95rem]">
                <Check className="mt-1 h-4 w-4 shrink-0 text-accent-bright" aria-hidden />
                {b}
              </li>
            ))}
          </ul>
        </Wrap>
      </section>

      <section aria-labelledby="deliverables-title" className="border-t border-line py-16 sm:py-20">
        <Wrap>
          <Reveal>
            <h2 id="deliverables-title" className="display text-3xl sm:text-4xl">
              {solution.key === "ai-business-assistant" ? "Capabilities and setup" : "What can be included"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted">You choose what you need. The quotation lists exactly what&apos;s included.</p>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {solution.deliverables.map((group) => (
              <Reveal key={group.title} className="edge relative rounded-2xl p-6">
                <h3 className="label-mono">{group.title}</h3>
                <ul className="mt-4 flex flex-col gap-2.5 text-sm">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>

          {solution.key === "ai-business-assistant" && (
            <Reveal className="mt-10 max-w-2xl rounded-2xl border border-line-strong p-6">
              <p className="label-mono">Illustration, not a live demo</p>
              <p className="mt-2 text-sm text-muted">How a customer question could be handled with a human approving the reply. This is a written example; no AI runs on this page.</p>
              <ol className="mt-5 flex flex-col gap-3 text-sm">
                {AI_EXAMPLE.map((m) => (
                  <li key={m.text} className="rounded-xl bg-white/[0.03] px-4 py-3">
                    <span className="block text-xs font-medium text-accent-bright">{m.from}</span>
                    {m.text}
                  </li>
                ))}
              </ol>
            </Reveal>
          )}
        </Wrap>
      </section>

      {solution.industries && (
        <section aria-labelledby="industries-title" className="border-t border-line py-16 sm:py-20">
          <Wrap>
            <Reveal>
              <h2 id="industries-title" className="display text-3xl sm:text-4xl">
                Examples by industry
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-muted">Ideas for what a system could do in each kind of business. Yours is shaped around how you work.</p>
            </Reveal>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {solution.industries.map((industry) => (
                <li key={industry.name} className="border-t border-line pt-4">
                  <h3 className="font-semibold tracking-tight">{industry.name}</h3>
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                    {industry.examples.map((e) => (
                      <li key={e}>· {e}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Wrap>
        </section>
      )}

      <section aria-labelledby="process-title" className="border-t border-line py-16 sm:py-20">
        <Wrap>
          <Reveal>
            <h2 id="process-title" className="display text-3xl sm:text-4xl">
              {solution.process ? "Implementation process" : "How it works"}
            </h2>
          </Reveal>
          <div className="mt-10">
            <ProcessSteps steps={solution.process} />
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-line p-6">
              <h3 className="label-mono">Quoted separately</h3>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-muted">
                {solution.costNotes.map((n) => (
                  <li key={n}>· {n}</li>
                ))}
              </ul>
            </div>
            {related.length > 0 && (
              <div className="rounded-2xl border border-line p-6">
                <h3 className="label-mono">Related work in my portfolio</h3>
                <ul className="mt-4 flex flex-col gap-3 text-sm">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/work/${r.slug}`} className="font-medium text-accent-bright hover:underline">
                        {r.project!.name}
                      </Link>
                      <span className="block text-muted">{r.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Wrap>
      </section>

      <section id="enquire" aria-labelledby="enquire-title" className="scroll-mt-20 border-t border-line py-16 sm:py-20">
        <Wrap>
          <Reveal>
            <p className="label-mono">{solution.name}</p>
            <h2 id="enquire-title" className="display mt-4 text-3xl sm:text-5xl">
              {solution.cta}
            </h2>
            <p className="mt-3 max-w-2xl text-muted">Answer a few questions and see your scope. I reply by email or WhatsApp, usually the same day.</p>
          </Reveal>
          <div className="mt-10">
            <EnquiryForm initialService={solution.key} lockService />
          </div>
        </Wrap>
      </section>
    </article>
  );
}
