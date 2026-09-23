import { clsx } from "clsx";
import { Reveal } from "@/components/reveal";

export type ProcessStepEntry = { id: string; title: string; description: string };

/// Admin-managed process steps as a timeline: vertical on mobile, a single
/// horizontal rail on desktop. Handles any number of steps.
export function ProcessTimeline({ steps }: { steps: ProcessStepEntry[] }) {
  const columns = steps.length <= 4 ? "lg:grid-cols-4" : steps.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-3 xl:grid-cols-6";
  return (
    <div className="relative">
      <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-line sm:hidden" />
      <ol className={clsx("grid sm:grid-cols-2", columns)}>
      {steps.map((step, index) => (
        <Reveal
          as="li"
          key={step.id}
          delay={index * 80}
          className="group relative pb-10 pl-9 sm:border-t sm:border-line sm:pb-12 sm:pl-0 sm:pr-8 sm:pt-8"
        >
            <span
              aria-hidden
              className="absolute left-0 top-1.5 flex h-[15px] w-[15px] items-center justify-center rounded-full border border-line-strong bg-canvas sm:-top-[8px]"
            >
              <span className="h-[5px] w-[5px] rounded-full bg-faint transition-colors duration-500 group-hover:bg-accent-bright" />
            </span>
            <span
              aria-hidden
              className="absolute -top-px left-0 hidden h-px w-0 bg-accent-bright transition-[width] duration-700 group-hover:w-full sm:block"
            />
            <p className="font-mono text-xs text-accent-bright">{String(index + 1).padStart(2, "0")}</p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight">{step.title}</h3>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">{step.description}</p>
        </Reveal>
      ))}
      </ol>
    </div>
  );
}
