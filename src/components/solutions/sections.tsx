import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { SolutionIcon } from "@/components/solutions/solution-icon";
import { PROCESS, WHY, type Solution } from "@/lib/solutions";

export function SolutionCard({ solution, index }: { solution: Solution; index: number }) {
  return (
    <Reveal as="li" delay={(index % 3) * 70} className="h-full">
      <article className="edge group relative flex h-full flex-col rounded-[1.25rem] p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line-strong text-accent-bright">
          <SolutionIcon icon={solution.icon} className="h-5 w-5" />
        </span>
        <h3 className="mt-6 text-xl font-semibold tracking-tight">
          <Link href={`/solutions/${solution.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {solution.name}
          </Link>
        </h3>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">{solution.summary}</p>
        <ul className="mt-5 flex flex-col gap-2 text-sm">
          {solution.highlights.map((h) => (
            <li key={h} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright" aria-hidden />
              {h}
            </li>
          ))}
        </ul>
        <p className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium text-accent-bright">
          {solution.cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </p>
      </article>
    </Reveal>
  );
}

export function ProcessSteps({ steps }: { steps?: string[] }) {
  const items = steps ? steps.map((title) => ({ title, text: "" })) : PROCESS;
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((step, index) => (
        <Reveal as="li" key={step.title} delay={(index % 3) * 60} className="border-t border-line pt-5">
          <p className="font-mono text-xs text-accent-bright">{String(index + 1).padStart(2, "0")}</p>
          <h3 className="mt-3 font-semibold tracking-tight">{step.title}</h3>
          {step.text && <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.text}</p>}
        </Reveal>
      ))}
    </ol>
  );
}

export function WhyList() {
  return (
    <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      {WHY.map((item) => (
        <li key={item.title} className="flex gap-3">
          <Check className="mt-1 h-4 w-4 shrink-0 text-accent-bright" aria-hidden />
          <div>
            <h3 className="font-semibold tracking-tight">{item.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{item.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
