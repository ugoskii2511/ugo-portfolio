import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Wrap } from "@/components/site/wrap";
import { SectionIntro } from "@/components/site/section-intro";
import { LinkButton } from "@/components/site/button";
import { Reveal } from "@/components/reveal";
import { SolutionIcon } from "@/components/solutions/solution-icon";
import { SOLUTIONS } from "@/lib/solutions";

/// Compact homepage entry to the Business Solutions pages.
export function SolutionsOverview() {
  return (
    <section aria-labelledby="solutions-title" className="border-t border-line py-24 sm:py-32">
      <Wrap>
        <SectionIntro
          label="Business Solutions"
          title={<span id="solutions-title">More than websites. Complete digital solutions for growing businesses.</span>}
          description="Custom software, automation, AI tools and digital infrastructure, built around how your business works."
          action={
            <LinkButton href="/solutions" variant="secondary">
              All solutions
            </LinkButton>
          }
        />
        <ul className="mt-14 grid gap-px overflow-hidden rounded-[1.25rem] border border-line bg-line sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          {SOLUTIONS.map((s, index) => (
            <Reveal as="li" key={s.key} delay={(index % 3) * 60} className="bg-canvas">
              <Link href={`/solutions/${s.slug}`} className="group flex h-full gap-4 p-6 transition-colors hover:bg-white/[0.025]">
                <SolutionIcon icon={s.icon} className="mt-0.5 h-5 w-5 shrink-0 text-accent-bright" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-semibold tracking-tight">
                    {s.name}
                    <ArrowUpRight className="h-4 w-4 text-faint transition-colors group-hover:text-accent-bright" aria-hidden />
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{s.summary}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </Wrap>
    </section>
  );
}
