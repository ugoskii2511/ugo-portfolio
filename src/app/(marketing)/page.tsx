import Link from "next/link";
import { prisma } from "@/lib/db";
import { Hero } from "@/components/home/hero";
import { ServicesPreview } from "@/components/home/services-preview";
import { Process } from "@/components/home/process";
import { CtaBanner } from "@/components/home/cta-banner";
import { ProjectCard } from "@/components/project-card";
import { ReviewCard } from "@/components/review-card";
import { ValueProps } from "@/components/value-props";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionCta } from "@/components/section-cta";
import { getServiceCategories } from "@/lib/get-service-categories";

const DEFAULT_HERO_HEADLINE = "Building fast, modern web experiences that work.";

export default async function HomePage() {
  const [projectCount, featuredProjects, settings, approvedReviews, serviceCategories, processSteps] =
    await Promise.all([
      prisma.project.count(),
      prisma.project.findMany({
        // Featured projects float to the top, but the section always shows
        // real work rather than sitting near-empty just because few
        // projects have been explicitly marked "Featured" yet.
        orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
        take: 6,
      }),
      prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
      prisma.review.findMany({
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
      }),
      getServiceCategories(),
      prisma.processStep.findMany({ orderBy: { order: "asc" } }),
    ]);

  const showReviews = (settings?.reviewsSectionShown ?? true) && approvedReviews.length > 0;
  const computedAverageRating =
    approvedReviews.length > 0
      ? approvedReviews.reduce((sum, review) => sum + review.rating, 0) / approvedReviews.length
      : null;

  const stats = {
    projectsDelivered: settings?.projectsDeliveredOverride ?? projectCount,
    clientReviews: settings?.clientReviewsOverride ?? approvedReviews.length,
    serviceCategories: settings?.serviceCategoriesOverride ?? serviceCategories.length,
  };
  const averageRating = settings?.averageRatingOverride ?? computedAverageRating;

  return (
    <>
      <Hero
        stats={stats}
        averageRating={averageRating}
        availabilityStatus={settings?.availabilityStatus ?? "Open for New Projects"}
        heroHeadline={settings?.heroHeadline ?? DEFAULT_HERO_HEADLINE}
        heroIntro={
          settings?.heroIntro ??
          "I'm Ugochukwu Chukwu Christian, a full-stack developer helping businesses grow their online presence with fast, modern websites, dashboards, e-commerce stores, and SaaS platforms that actually convert."
        }
        serviceCategories={serviceCategories}
      />
      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="Why Work With Me"
            title={
              <>
                Built for <span className="italic text-primary">real business results</span>
              </>
            }
            description="Every project — a five-page site or a full SaaS platform — gets the same standard."
          />
          <div className="mt-10">
            <ValueProps />
          </div>
          <SectionCta label="Like what you see? Let's build something just as solid for you." />
        </Container>
      </section>

      <ServicesPreview />
      <Process steps={processSteps} />

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
            <SectionCta label="Want a project like these built for your business?" />
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
                    position: review.position,
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
            <SectionCta label="Want results like these for your own project?" />
          </Container>
        </section>
      )}

      <CtaBanner />
    </>
  );
}
