import Link from "next/link";
import { Phone } from "@/components/site/phone";
import { Reveal } from "@/components/reveal";
import type { ShowcaseProject } from "@/lib/projects";

/// Grid card for the /work index. The whole card is one link to the case
/// study; the live site is one click further, on the case study itself.
export function WorkCard({ project, index }: { project: ShowcaseProject; index: number }) {
  return (
    <Reveal as="li" delay={(index % 2) * 90}>
      <Link
        href={`/work/${project.slug}`}
        className="group edge relative block overflow-hidden rounded-[1.5rem] transition-colors"
      >
        <div className="relative isolate flex justify-center overflow-hidden border-b border-line px-6 pb-0 pt-10 sm:pt-12">
          <div aria-hidden className="blueprint-grid absolute inset-0 -z-10" />
          <div
            aria-hidden
            className="accent-glow absolute left-1/2 top-2/3 -z-10 h-80 w-80 -translate-x-1/2 -translate-y-1/2 opacity-40 transition-opacity duration-700 group-hover:opacity-90"
          />
          <div className="w-[62%] max-w-[15rem] translate-y-10 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-4">
            <Phone
              src={project.imageUrl}
              alt={`${project.name} website on a phone`}
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 60vw"
            />
          </div>
        </div>
        <div className="flex items-start justify-between gap-6 p-6 sm:p-7">
          <div className="min-w-0">
            <p className="label-mono">{project.category}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{project.name}</h2>
            <p className="mt-2 line-clamp-2 text-pretty text-sm leading-relaxed text-muted">{project.lead}</p>
          </div>
          <span
            aria-hidden
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong text-muted transition-all duration-500 group-hover:border-accent group-hover:bg-accent group-hover:text-white"
          >
            →
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
