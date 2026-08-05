"use client";

import { useSpotlight } from "@/lib/use-spotlight";
import { Reveal } from "@/components/reveal";

export type ProcessStepEntry = { id: string; title: string; description: string };

export function ProcessStepsGrid({ steps }: { steps: ProcessStepEntry[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((item, index) => (
        <ProcessStepCard key={item.id} item={item} index={index} />
      ))}
    </div>
  );
}

function ProcessStepCard({ item, index }: { item: ProcessStepEntry; index: number }) {
  const { onMouseMove, onMouseLeave, spotlightStyle } = useSpotlight();

  return (
    <Reveal
      delay={index * 60}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="glass-panel group relative overflow-hidden rounded-2xl p-6 hover:-translate-y-1"
    >
      <div className="pointer-events-none absolute inset-0" style={spotlightStyle} />
      <span className="font-serif text-3xl font-bold text-primary/40 transition-colors duration-300 group-hover:text-primary/70">
        {String(index + 1).padStart(2, "0")}
      </span>
      <h3 className="mt-3 font-semibold">{item.title}</h3>
      <p className="mt-1.5 text-sm text-foreground/70">{item.description}</p>
    </Reveal>
  );
}
