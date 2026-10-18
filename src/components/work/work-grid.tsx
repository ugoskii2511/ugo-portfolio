"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { ArrowUpRight } from "lucide-react";
import { Phone } from "@/components/site/phone";
import { Reveal } from "@/components/reveal";
import { buttonClass } from "@/components/site/button";
import { SaleBadge } from "@/components/work/sale-badge";
import { DiscussProjectButton, type InquiryOptions } from "@/components/work/discuss-project";
import type { Sale } from "@/lib/projects";
import { formatRange } from "@/lib/pricing";

export type WorkCardData = {
  id: string;
  slug: string;
  name: string;
  category: string;
  lead: string;
  imageUrl: string | null;
  liveUrl: string | null;
  features: string[];
  stack: string[];
  sale?: Sale;
  /// Group used by the filter ("Business websites", "E-commerce", …).
  group: string | null;
  estimate: { label: string; min: number; max: number | null } | null;
};

/// The /work grid: filter chips by type of website, and cards with real
/// screenshots, features, tech, an estimate for a similar build and actions.
export function WorkGrid({ projects, inquiry }: { projects: WorkCardData[]; inquiry: InquiryOptions }) {
  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects) if (p.group) counts.set(p.group, (counts.get(p.group) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [projects]);
  const [active, setActive] = useState<string>("All");
  const shown = active === "All" ? projects : projects.filter((p) => p.group === active);

  return (
    <div className="mt-12 lg:mt-16">
      {groups.length > 1 && (
        <div role="group" aria-label="Filter projects by type" className="flex flex-wrap gap-2">
          {[["All", projects.length] as [string, number], ...groups].map(([name, count]) => (
            <button
              key={name}
              type="button"
              aria-pressed={active === name}
              onClick={() => setActive(name)}
              className={clsx(
                "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
                active === name ? "border-accent bg-accent-soft text-fg" : "border-line text-muted hover:border-line-strong hover:text-fg"
              )}
            >
              {name}
              <span className={clsx("font-mono text-[0.7rem]", active === name ? "text-accent-bright" : "text-faint")}>{count}</span>
            </button>
          ))}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        Showing {shown.length} project{shown.length === 1 ? "" : "s"}
      </p>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:gap-6">
        {shown.map((project, index) => (
          <WorkCard key={project.id} project={project} index={index} inquiry={inquiry} />
        ))}
      </ul>
    </div>
  );
}

function WorkCard({ project, index, inquiry }: { project: WorkCardData; index: number; inquiry: InquiryOptions }) {
  const titleId = `work-${project.id}`;
  return (
    <Reveal as="li" delay={(index % 2) * 90} className="h-full">
      <article aria-labelledby={titleId} className="group edge relative flex h-full flex-col overflow-hidden rounded-[1.5rem] transition-colors">
        {/* The whole card opens the case study; the buttons below sit above this link. */}
        <Link href={`/work/${project.slug}`} aria-labelledby={titleId} className="absolute inset-0 z-0 rounded-[1.5rem] focus-visible:outline-offset-[-4px]" tabIndex={-1} />
        <div className="pointer-events-none relative isolate flex justify-center overflow-hidden border-b border-line px-6 pb-0 pt-10 sm:pt-12">
          <div aria-hidden className="blueprint-grid absolute inset-0 -z-10" />
          <div
            aria-hidden
            className="accent-glow absolute left-1/2 top-2/3 -z-10 h-80 w-80 -translate-x-1/2 -translate-y-1/2 opacity-40 transition-opacity duration-700 group-hover:opacity-90"
          />
          <div className="w-[62%] max-w-[15rem] translate-y-10 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-4 motion-reduce:transition-none motion-reduce:group-hover:translate-y-10">
            <Phone src={project.imageUrl} alt={`${project.name} website on a phone`} sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 60vw" />
          </div>
        </div>

        <div className="pointer-events-none relative flex flex-1 flex-col gap-4 p-6 sm:p-7">
          <div>
            <p className="label-mono">{project.category}</p>
            <h2 id={titleId} className="mt-3 text-2xl font-semibold tracking-tight sm:text-[1.7rem]">
              <Link href={`/work/${project.slug}`} className="pointer-events-auto outline-offset-4 hover:text-accent-bright">
                {project.name}
              </Link>
            </h2>
            {project.sale && (
              <p className="mt-2">
                <SaleBadge sale={project.sale} />
              </p>
            )}
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">{project.lead}</p>
          </div>

          {project.features.length > 0 && (
            <ul className="flex flex-col gap-1.5 text-sm text-fg/85" aria-label="Key features">
              {project.features.slice(0, 3).map((f) => (
                <li key={f} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-bright" />
                  <span className="line-clamp-2">{f}</span>
                </li>
              ))}
            </ul>
          )}

          {project.stack.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Technology">
              {project.stack.slice(0, 5).map((tech) => (
                <li key={tech} className="rounded-md border border-line bg-white/[0.025] px-2 py-1 font-mono text-[0.68rem] text-muted">
                  {tech}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto flex flex-col gap-4 border-t border-line pt-4">
            {project.estimate && (
              <p className="text-sm">
                <span className="text-muted">Similar {project.estimate.label.toLowerCase()}: </span>
                <span className="font-semibold text-fg">{formatRange(project.estimate.min, project.estimate.max)}</span>
                <span className="block text-xs text-faint">Estimate only, not a quotation. See the pricing notice.</span>
              </p>
            )}
            <div className="pointer-events-auto relative z-10 flex flex-wrap gap-2">
              <Link href={`/work/${project.slug}`} className={buttonClass("secondary", "sm")}>
                View details
              </Link>
              {project.liveUrl && (
                <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm", "!px-3")} aria-label={`Visit ${project.name} live site (opens in a new tab)`}>
                  Live site <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
              <DiscussProjectButton options={inquiry} projectName={project.name} defaultType={project.estimate?.label} size="sm" variant="primary">
                Discuss a similar project
              </DiscussProjectButton>
            </div>
          </div>
        </div>
      </article>
    </Reveal>
  );
}
