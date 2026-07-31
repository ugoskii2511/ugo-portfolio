"use client";

import type { ReactNode } from "react";
import { useSpotlight } from "@/lib/use-spotlight";
import { Reveal } from "@/components/reveal";

export function StatCard({
  icon,
  label,
  value,
  index = 0,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  index?: number;
}) {
  const { onMouseMove, onMouseLeave, spotlightStyle } = useSpotlight();

  return (
    <Reveal
      delay={index * 60}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="glass-panel relative flex items-center gap-4 overflow-hidden rounded-2xl p-5 hover:-translate-y-1"
    >
      <div className="pointer-events-none absolute inset-0" style={spotlightStyle} />
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        <p className="text-sm text-foreground/60">{label}</p>
      </div>
    </Reveal>
  );
}
