import { cache } from "react";
import { prisma } from "@/lib/db";
import type { ShowcaseProject } from "@/lib/projects";
import type { Testimonial } from "@/components/home/testimonials";

export const DEFAULT_CONTACT_EMAIL = "elitetechsolutions607@gmail.com";
export const DEFAULT_WHATSAPP_NUMBER = "2349065606430";
export const DEFAULT_HERO_HEADLINE = "I build digital products people actually use.";
export const DEFAULT_HERO_INTRO =
  "I design and engineer websites, web applications and SaaS platforms, taking ideas from a first conversation to a product running in production.";
export const DEFAULT_ABOUT_BIO =
  "I'm Ugochukwu, an independent software engineer. I build websites, web applications and SaaS products end to end, from the interface people touch to the database, payments and infrastructure underneath.\n\nI work directly with founders and businesses. No account managers, no hand-offs. We start by understanding the problem, then I design, build and ship it, and keep you in the loop the whole way.\n\nWhat I care about is simple: products that are fast, feel considered, and are built well enough that any engineer could pick them up after me.";

/// Memoized per request: the layout, its metadata and the page all read
/// settings, and this keeps that to one query on the small connection pool.
export const getSettings = cache(async () => prisma.siteSettings.findUnique({ where: { id: "singleton" } }));

/// Approved reviews, each linked to its project when the reviewer's
/// position names one (e.g. "Founder, The Media Reborn").
export async function getTestimonials(projects: ShowcaseProject[]): Promise<Testimonial[]> {
  const reviews = await prisma.review.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
  });
  return reviews.map((review) => {
    const position = review.position?.toLowerCase() ?? "";
    const project = projects.find((p) => p.reviewMatch && position.includes(p.reviewMatch));
    return {
      id: review.id,
      clientName: review.clientName,
      position: review.position,
      rating: review.rating,
      message: review.message,
      project: project ? { name: project.name, slug: project.slug } : undefined,
    };
  });
}
