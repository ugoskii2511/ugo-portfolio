"use client";

import { FolderKanban, LayoutGrid, MessageSquare, Star, type LucideIcon } from "lucide-react";
import { useSpotlight } from "@/lib/use-spotlight";
import { Reveal } from "@/components/reveal";

export type AboutStatsData = {
  projectsDelivered: number;
  clientReviews: number;
  serviceCategories: number;
  averageRating: number | null;
};

export function AboutStats({ stats }: { stats: AboutStatsData }) {
  const items: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: FolderKanban, label: "Projects Delivered", value: `${stats.projectsDelivered}+` },
    { icon: MessageSquare, label: "Client Reviews", value: `${stats.clientReviews}+` },
    { icon: LayoutGrid, label: "Service Categories", value: `${stats.serviceCategories}` },
    {
      icon: Star,
      label: "Average Rating",
      value: stats.averageRating !== null ? stats.averageRating.toFixed(1) : "—",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <StatTile key={item.label} item={item} index={index} />
      ))}
    </div>
  );
}

function StatTile({
  item,
  index,
}: {
  item: { icon: LucideIcon; label: string; value: string };
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
      <p className="mt-4 font-serif text-3xl font-bold text-primary">{item.value}</p>
      <p className="mt-1 text-sm text-foreground/60">{item.label}</p>
    </Reveal>
  );
}
