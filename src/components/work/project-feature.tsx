import Link from "next/link";
import { clsx } from "clsx";
import { Phone } from "@/components/site/phone";
import { LinkButton } from "@/components/site/button";
import { StackList } from "@/components/work/stack-list";
import type { ShowcaseProject } from "@/lib/projects";

/// One large, editorial project panel. On desktop the panels are sticky, so
/// as you scroll each one slides up over the last and takes focus.
export function ProjectFeature({
  project,
  index,
  total,
  sticky = true,
}: {
  project: ShowcaseProject;
  index: number;
  total: number;
  sticky?: boolean;
}) {
  const number = (n: number) => String(n).padStart(2, "0");
  return (
    <article
      aria-labelledby={`project-${project.slug}`}
      className={clsx(
        "group edge relative overflow-hidden rounded-[1.75rem]",
        sticky && "lg:sticky lg:top-24"
      )}
      style={sticky ? { zIndex: index + 1 } : undefined}
    >
      <div className="grid lg:min-h-[min(40rem,calc(100svh-8rem))] lg:grid-cols-12">
        <div className="relative isolate order-first flex items-center justify-center overflow-hidden border-b border-line px-6 py-10 sm:py-14 lg:order-last lg:col-span-6 lg:border-b-0 lg:border-l">
          <div aria-hidden className="blueprint-grid absolute inset-0 -z-10" />
          <div
            aria-hidden
            className="accent-glow absolute left-1/2 top-1/2 -z-10 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 opacity-60 transition-opacity duration-700 group-hover:opacity-100"
          />
          <Link
            href={`/work/${project.slug}`}
            tabIndex={-1}
            aria-hidden
            className="block w-[11.5rem] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-2 group-hover:rotate-[-1.5deg] sm:w-[14rem] lg:w-[15.5rem]"
          >
            <Phone
              src={project.imageUrl}
              alt=""
              sizes="(min-width: 1024px) 250px, (min-width: 640px) 224px, 184px"
            />
          </Link>
        </div>

        <div className="flex flex-col p-6 sm:p-10 lg:col-span-6 lg:p-12">
          <p className="label-mono flex items-center gap-3">
            <span className="text-accent-bright">{number(index + 1)}</span>
            <span className="text-faint">/ {number(total)}</span>
            <span aria-hidden className="h-px w-6 bg-line-strong" />
            {project.category}
          </p>

          <h3 id={`project-${project.slug}`} className="display mt-6 text-balance text-4xl sm:text-5xl lg:text-[3.6rem]">
            {project.name}
          </h3>
          <p className="mt-5 max-w-md text-pretty leading-relaxed text-muted">{project.lead}</p>

          {project.stack.length > 0 && (
            <div className="mt-7">
              <StackList stack={project.stack} />
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-3 lg:mt-auto lg:pt-10">
            <LinkButton href={`/work/${project.slug}`} variant="secondary" aria-label={`View ${project.name} case study`}>
              View case study
            </LinkButton>
            {project.liveUrl && (
              <LinkButton
                href={project.liveUrl}
                variant="ghost"
                arrow="out"
                className="!px-3"
                aria-label={`Visit ${project.name} live site (opens in a new tab)`}
              >
                {project.domain ?? "Live site"}
              </LinkButton>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
