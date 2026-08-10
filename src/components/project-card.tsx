"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSpotlight } from "@/lib/use-spotlight";
import { Reveal } from "@/components/reveal";

export type ProjectCardData = {
  id: string;
  name: string;
  summary: string;
  liveUrl: string | null;
  imageUrl?: string | null;
  techStack: string[];
  featured: boolean;
};

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const { onMouseMove, onMouseLeave, spotlightStyle } = useSpotlight();

  return (
    <Reveal
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="glass-panel group relative flex flex-col overflow-hidden rounded-2xl hover:-translate-y-1.5"
    >
      <div className="pointer-events-none absolute inset-0 z-10" style={spotlightStyle} />
      <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-primary-soft to-transparent">
        {project.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
            />
            {/* Cover images are often full-page screenshots with their own
                text baked in near the crop line — fade the bottom edge into
                the card body instead of cutting it off hard against the
                title. */}
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-surface to-transparent" />
          </>
        ) : (
          <>
            <div className="grid-texture absolute inset-0" />
            <span className="font-serif text-5xl font-bold text-primary/30 transition-transform duration-500 group-hover:scale-125">
              {project.name.charAt(0)}
            </span>
          </>
        )}
        {project.techStack[0] && (
          <span className="glass-panel absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-primary">
            {project.techStack[0]}
          </span>
        )}
        {project.featured && (
          <span className="absolute right-4 top-4">
            <Badge>Featured</Badge>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <h3 className="font-serif text-lg font-bold">{project.name}</h3>
        <p className="text-sm text-foreground/70">{project.summary}</p>

        <div className="flex flex-wrap gap-2">
          {project.techStack.map((tech) => (
            <Badge key={tech}>{tech}</Badge>
          ))}
        </div>

        {project.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link mt-auto inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary transition hover:text-primary-dark"
          >
            Visit live demo
            <ExternalLink className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
          </a>
        )}
      </div>
    </Reveal>
  );
}
