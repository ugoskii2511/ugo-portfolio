"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { clsx } from "clsx";
import { Plus } from "lucide-react";
import type { Capability } from "@/lib/capabilities";

export function CapabilityList({
  capabilities,
  projectNames,
}: {
  capabilities: Capability[];
  /// slug → display name for the projects that actually exist.
  projectNames: Record<string, string>;
}) {
  const [active, setActive] = useState(0);
  const baseId = useId();

  return (
    <ul className="border-t border-line">
      {capabilities.map((capability, index) => {
        const open = active === index;
        const panelId = `${baseId}-panel-${index}`;
        const examples = capability.examples.filter((slug) => projectNames[slug]);
        return (
          <li
            key={capability.title}
            className="border-b border-line"
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setActive(index);
            }}
          >
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setActive(open ? -1 : index)}
                className="group grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 py-7 text-left sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:py-9 lg:grid-cols-[4rem_minmax(0,5fr)_minmax(0,6fr)_auto] lg:gap-8"
              >
                <span className={clsx("font-mono text-xs transition-colors", open ? "text-accent-bright" : "text-faint")}>
                  0{index + 1}
                </span>
                <span
                  className={clsx(
                    "display text-3xl transition-colors duration-500 sm:text-5xl",
                    open ? "text-fg" : "text-fg/45 group-hover:text-fg/80"
                  )}
                >
                  {capability.title}
                </span>
                <span className="hidden text-pretty text-muted lg:block">{capability.summary}</span>
                <span
                  aria-hidden
                  className={clsx(
                    "flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-500",
                    open ? "rotate-45 border-accent bg-accent text-white" : "border-line-strong text-muted"
                  )}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-label={capability.title}
              className={clsx(
                "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
              inert={!open}
            >
              <div className="overflow-hidden">
                <div className="grid gap-6 pb-9 sm:pl-[5rem] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_2.5rem] lg:gap-8 lg:pl-[6rem]">
                  <p className="text-pretty text-muted lg:hidden">{capability.summary}</p>
                  <ul className="flex flex-wrap gap-2 lg:col-start-2">
                    {capability.includes.map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-line bg-white/[0.02] px-3 py-1.5 text-xs text-fg/85"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                  {examples.length > 0 && (
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm lg:col-start-2">
                      <span className="label-mono">Shipped</span>
                      {examples.map((slug, i) => (
                        <span key={slug} className="inline-flex items-center gap-3">
                          <Link
                            href={`/work/${slug}`}
                            className="text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent-bright hover:decoration-accent-bright"
                          >
                            {projectNames[slug]}
                          </Link>
                          {i < examples.length - 1 && <span aria-hidden className="text-faint">/</span>}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
