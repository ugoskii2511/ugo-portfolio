import Link from "next/link";
import { prisma } from "@/lib/db";
import { serviceCategories } from "@/lib/services-data";
import { Hero } from "@/components/home/hero";
import { ServicesPreview } from "@/components/home/services-preview";
import { Process } from "@/components/home/process";
import { CtaBanner } from "@/components/home/cta-banner";
import { ProjectCard } from "@/components/project-card";
import { ReviewCard } from "@/components/review-card";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export default async function HomePage() {
  const [projectCount, featuredProjects, settings, approvedReviews] = await Promise.all([
    prisma.project.count(),
    prisma.project.findMany({
      where: { featured: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: 3,
    }),
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    prisma.review.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const showReviews = (settings?.reviewsSectionShown ?? true) && approvedReviews.length > 0;
  const averageRating =
    approvedReviews.length > 0
      ? approvedReviews.reduce((sum, review) => sum + review.rating, 0) / approvedReviews.length
      : null;

  return (
    <>
      <Hero
        stats={{
          projectsDelivered: projectCount,
          clientReviews: approvedReviews.length,
          serviceCategories: serviceCategories.length,
        }}
        averageRating={averageRating}
        availabilityStatus={settings?.availabilityStatus ?? "Open for New Projects"}
        heroIntro={
          settings?.heroIntro ??
          "I'm Ugochukwu Chukwu Christian, a full-stack developer helping founders and businesses ship websites, dashboards, e-commerce stores, and SaaS platforms that actually convert."
        }
      />
      <ServicesPreview />
      <Process />

      {featuredProjects.length > 0 && (
        <section className="py-20">
          <Container>
            <SectionHeading
              eyebrow="Featured Work"
              title={
                <>
                  A few recent <span className="italic text-primary">projects</span>
                </>
              }
              description="A snapshot of platforms and products I've built end to end."
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProjects.map((project) => (
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
            <div className="mt-10 text-center">
              <Link
                href="/portfolio"
                className="text-sm font-semibold text-primary transition hover:text-primary-dark"
              >
                View full portfolio →
              </Link>
            </div>
          </Container>
        </section>
      )}

      {showReviews && (
        <section className="py-20">
          <Container>
            <SectionHeading
              eyebrow="Client Reviews"
              title={
                <>
                  What clients <span className="italic text-primary">say</span>
                </>
              }
              description="Real feedback from people I've worked with."
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {approvedReviews.slice(0, 2).map((review) => (
                <ReviewCard
                  key={review.id}
                  review={{
                    id: review.id,
                    clientName: review.clientName,
                    rating: review.rating,
                    message: review.message,
                  }}
                />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/reviews"
                className="text-sm font-semibold text-primary transition hover:text-primary-dark"
              >
                Read all reviews →
              </Link>
            </div>
          </Container>
        </section>
      )}

      <CtaBanner />
    </>
  );
}
