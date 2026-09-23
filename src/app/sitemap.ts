import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getShowcaseProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

const ROUTES = [
  { path: "", priority: 1 },
  { path: "/work", priority: 0.9 },
  { path: "/services", priority: 0.9 },
  { path: "/about", priority: 0.8 },
  { path: "/contact", priority: 0.8 },
  { path: "/reviews", priority: 0.6 },
  { path: "/review", priority: 0.3 },
  { path: "/announcements", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const pages: MetadataRoute.Sitemap = ROUTES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
  }));

  // Case studies are generated from the database; a DB hiccup shouldn't
  // take the whole sitemap down with it.
  try {
    const projects = await getShowcaseProjects();
    for (const project of projects) {
      pages.push({
        url: `${SITE_URL}/work/${project.slug}`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error("sitemap: failed to load projects", error);
  }

  return pages;
}
