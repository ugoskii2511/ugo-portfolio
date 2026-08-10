import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProjectCard } from "@/components/project-card";
import { SectionCta } from "@/components/section-cta";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "A showcase of websites, dashboards, and platforms built by Ugochukwu Chukwu Christian.",
};

export default async function PortfolioPage() {
  const projects = await prisma.project.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Portfolio"
          title={
            <>
              Selected <span className="italic text-primary">projects</span>
            </>
          }
          description="A mix of e-commerce stores, SaaS platforms, and custom web applications."
        />

        {projects.length === 0 ? (
          <p className="mt-16 text-center text-foreground/60">
            Projects are coming soon — check back shortly.
          </p>
        ) : (
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={{
                  id: project.id,
                  name: project.name,
                  summary: project.summary,
                  liveUrl: project.liveUrl,
                  imageUrl: project.imageUrl,
                  techStack: project.techStack,
                  featured: project.featured,
                }}
              />
            ))}
          </div>
        )}
        <SectionCta label="Like what you see? Let's scope out your project." />
      </Container>
    </div>
  );
}
