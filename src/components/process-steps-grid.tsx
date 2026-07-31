"use client";

import { useSpotlight } from "@/lib/use-spotlight";
import { Reveal } from "@/components/reveal";
import { PROCESS_STEPS } from "@/lib/process-data";

export function ProcessStepsGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PROCESS_STEPS.map((item, index) => (
        <ProcessStepCard key={item.step} item={item} index={index} />
      ))}
    </div>
  );
}

function ProcessStepCard({
  item,
  index,
}: {
  item: (typeof PROCESS_STEPS)[number];
  index: number;
}) {
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
        {item.step}
      </span>
      <h3 className="mt-3 font-semibold">{item.title}</h3>
      <p className="mt-1.5 text-sm text-foreground/70">{item.description}</p>
    </Reveal>
  );
}
