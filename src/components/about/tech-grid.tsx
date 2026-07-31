"use client";

import { TECH_STACK } from "@/lib/tech-stack-data";
import { TechBadge } from "@/components/tech-badge";

export function TechGrid() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
      {TECH_STACK.map((tech, index) => (
        <TechBadge key={tech.name} tech={tech} index={index} />
      ))}
    </div>
  );
}
