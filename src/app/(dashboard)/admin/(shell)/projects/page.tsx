import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ProjectsManager } from "@/components/admin/projects-manager";
import { toShowcase } from "@/lib/projects";

export const metadata: Metadata = { title: "Projects" };

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return (
    <ProjectsManager
      projects={projects.map((project) => {
        // How the public site presents this project (clean display name,
        // category, case-study slug) so the admin can see what visitors see.
        const publicView = toShowcase(project);
        return {
          id: project.id,
          name: project.name,
          summary: project.summary,
          liveUrl: project.liveUrl,
          imageUrl: project.imageUrl,
          techStack: project.techStack,
          featured: project.featured,
          order: project.order,
          publicName: publicView.name,
          category: publicView.category,
          slug: publicView.slug,
        };
      })}
    />
  );
}
