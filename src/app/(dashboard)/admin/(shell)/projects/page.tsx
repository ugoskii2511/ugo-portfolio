import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ProjectsManager } from "@/components/admin/projects-manager";

export const metadata: Metadata = { title: "Projects" };

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return (
    <ProjectsManager
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        summary: project.summary,
        liveUrl: project.liveUrl,
        imageUrl: project.imageUrl,
        techStack: project.techStack,
        featured: project.featured,
        order: project.order,
      }))}
    />
  );
}
