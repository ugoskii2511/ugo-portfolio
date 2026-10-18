import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ProjectsManager } from "@/components/admin/projects-manager";
import { toShowcase } from "@/lib/projects";
import { getPricing } from "@/lib/pricing-server";
import { formatRange, PACKAGE_ORDER, projectEstimate } from "@/lib/pricing";

export const metadata: Metadata = { title: "Projects" };

export default async function AdminProjectsPage() {
  const [projects, pricing] = await Promise.all([
    prisma.project.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] }),
    getPricing(),
  ]);
  const packages = PACKAGE_ORDER.map((key) => ({ key, label: pricing.config.packages[key].label, range: formatRange(pricing.config.packages[key].min, pricing.config.packages[key].max) }));

  return (
    <ProjectsManager
      packages={packages}
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
          published: project.published,
          rawCategory: project.category,
          lead: project.lead,
          challenge: project.challenge,
          solution: project.solution,
          features: project.features,
          galleryUrls: project.galleryUrls,
          pricingPackage: project.pricingPackage,
          priceMinNaira: project.priceMinNaira,
          priceMaxNaira: project.priceMaxNaira,
          estimate: (() => {
            const e = projectEstimate(pricing.config, project);
            return e ? formatRange(e.min, e.max) : null;
          })(),
        };
      })}
    />
  );
}
