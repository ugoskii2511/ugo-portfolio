"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { clsx } from "clsx";

export type ConsoleProject = {
  slug: string;
  name: string;
  category: string;
  stack: string[];
  domain: string | null;
  imageUrl: string;
};

const CYCLE_MS = 6000;

/// The hero's "live projects" console: a device preview plus a manifest of
/// what each real project is and what it runs on. It auto-advances; the
/// timer is the tab's CSS progress bar itself (advance on animationend), so
/// pausing on hover/focus is just `animation-play-state`, and reduced-motion
/// users get no animation, so no auto-advance, for free.
export function HeroConsole({ projects }: { projects: ConsoleProject[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = projects[active];
  if (!current) return null;

  const rows: [string, React.ReactNode][] = [
    ["project", <span key="p" className="text-fg">{current.name}</span>],
    ["type", current.category],
    ["stack", current.stack.length ? current.stack.slice(0, 5).join(" · ") : "—"],
    [
      "status",
      <span key="s" className="text-fg">
        <span className="live-dot mr-2 inline-block align-middle" aria-hidden />
        live
        {current.domain && <span className="block break-all text-muted">{current.domain}</span>}
      </span>,
    ],
  ];

  return (
    <div
      className="edge relative rounded-[1.4rem] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.9)]"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
        <p className="label-mono !text-[0.65rem]">ugo / build — live work</p>
        <p className="font-mono text-[0.65rem] tabular-nums text-faint" aria-hidden>
          {String(active + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
        </p>
      </div>

      <div className="grid grid-cols-[7.25rem_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] sm:gap-6 sm:p-6">
        <Link
          href={`/work/${current.slug}`}
          className="group relative block"
          aria-label={`${current.name} case study`}
        >
          <div className="relative rounded-[1.4rem] border border-white/10 bg-[#0c0d10] p-[5px] sm:rounded-[1.9rem] sm:p-[6px]">
            <div className="screen-pan relative aspect-[10/16] overflow-hidden rounded-[1.1rem] bg-raised-2 sm:rounded-[1.5rem]">
              {projects.map((project, index) => (
                <Image
                  key={project.slug}
                  src={project.imageUrl}
                  alt={index === active ? `${project.name} on mobile` : ""}
                  fill
                  sizes="(min-width: 1024px) 220px, (min-width: 640px) 40vw, 120px"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : undefined}
                  className={clsx(
                    "object-cover object-top transition-opacity duration-700",
                    index === active ? "opacity-100" : "opacity-0"
                  )}
                />
              ))}
            </div>
          </div>
        </Link>

        <div className="flex min-w-0 flex-col">
          <dl key={current.slug} className="page-enter space-y-3 font-mono text-[0.72rem] leading-relaxed sm:space-y-4 sm:text-xs">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-0.5 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-3">
                <dt className="text-faint">{label}</dt>
                <dd className="min-w-0 break-words text-muted">{value}</dd>
              </div>
            ))}
          </dl>
          <Link
            href={`/work/${current.slug}`}
            className="mt-auto hidden items-center gap-1.5 pt-6 text-sm text-fg transition-colors hover:text-accent-bright sm:inline-flex"
          >
            Read the case study <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <div className="grid border-t border-line" style={{ gridTemplateColumns: `repeat(${projects.length}, minmax(0, 1fr))` }}>
        {projects.map((project, index) => {
          const isActive = index === active;
          return (
            <button
              key={project.slug}
              type="button"
              onClick={() => setActive(index)}
              aria-pressed={isActive}
              aria-label={`Show ${project.name}`}
              className={clsx(
                "relative min-h-11 truncate border-line px-2 py-3 text-left text-[0.7rem] transition-colors sm:px-4 sm:text-xs",
                index > 0 && "border-l",
                isActive ? "text-fg" : "text-faint hover:text-muted"
              )}
            >
              {project.name}
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-line" />
              {isActive && (
                <span
                  aria-hidden
                  key={`${project.slug}-${active}`}
                  onAnimationEnd={() => setActive((active + 1) % projects.length)}
                  className="absolute inset-x-0 bottom-0 h-px origin-left bg-accent-bright motion-safe:animate-[progress_linear_both]"
                  style={{
                    animationDuration: `${CYCLE_MS}ms`,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
