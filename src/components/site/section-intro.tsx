import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Reveal } from "@/components/reveal";

/// Section header used across the site: a mono index + label on the left,
/// a large headline, and an optional supporting line / action.
export function SectionIntro({
  index,
  label,
  title,
  description,
  action,
  className,
  headingLevel = 2,
}: {
  index?: string;
  label: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <Reveal className={clsx("grid gap-6 lg:grid-cols-12 lg:gap-10", className)}>
      <p className="label-mono flex items-center gap-3 self-start lg:col-span-3 lg:pt-5">
        {index && <span className="text-accent-bright">{index}</span>}
        <span aria-hidden className="h-px w-6 bg-line-strong" />
        {label}
      </p>
      <div className="lg:col-span-9">
        <Heading className="display max-w-4xl text-balance text-[2.5rem] sm:text-5xl lg:text-6xl">
          {title}
        </Heading>
        {(description || action) && (
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            {description && (
              <p className="max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
                {description}
              </p>
            )}
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}
      </div>
    </Reveal>
  );
}
