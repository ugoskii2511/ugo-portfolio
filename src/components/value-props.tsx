"use client";

import { Lock, MessagesSquare, Rocket, ShieldCheck, type LucideIcon } from "lucide-react";
import { useSpotlight } from "@/lib/use-spotlight";
import { Reveal } from "@/components/reveal";

const VALUE_PROPS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Rocket,
    title: "Fast, reliable delivery",
    description: "Clear timelines and steady progress updates from kickoff to launch.",
  },
  {
    icon: MessagesSquare,
    title: "Clear communication",
    description: "No jargon overload — you'll always know exactly where your project stands.",
  },
  {
    icon: ShieldCheck,
    title: "Security-first builds",
    description: "Auth, data, and payments handled with best practices, not shortcuts.",
  },
  {
    icon: Lock,
    title: "Clean, maintainable code",
    description: "Code that's easy to hand off, extend, or maintain long after launch.",
  },
];

export function ValueProps() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {VALUE_PROPS.map((item, index) => (
        <ValuePropCard key={item.title} item={item} index={index} />
      ))}
    </div>
  );
}

function ValuePropCard({
  item,
  index,
}: {
  item: (typeof VALUE_PROPS)[number];
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
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
        <item.icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold">{item.title}</h3>
      <p className="mt-1.5 text-sm text-foreground/70">{item.description}</p>
    </Reveal>
  );
}
