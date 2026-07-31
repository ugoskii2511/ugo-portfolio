"use client";

import { useSpotlight } from "@/lib/use-spotlight";
import { Reveal } from "@/components/reveal";
import type { TechItem } from "@/lib/tech-stack-data";

export function TechBadge({ tech, index }: { tech: TechItem; index: number }) {
  const { onMouseMove, onMouseLeave, spotlightStyle } = useSpotlight(tech.color);
  const Icon = tech.icon;

  return (
    <Reveal
      delay={(index % 10) * 40}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="glass-panel group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl px-3 py-5 text-center hover:-translate-y-1"
    >
      <div className="pointer-events-none absolute inset-0" style={spotlightStyle} />
      <Icon
        className="h-7 w-7 shrink-0 transition-transform duration-300 group-hover:scale-110"
        style={{ color: tech.color }}
      />
      <span className="text-xs font-medium text-foreground/80">{tech.name}</span>
    </Reveal>
  );
}
