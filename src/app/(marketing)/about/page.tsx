import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ValueProps } from "@/components/value-props";
import { TechGrid } from "@/components/about/tech-grid";
import { AboutStats } from "@/components/about/about-stats";
import { ProcessStepsGrid } from "@/components/process-steps-grid";
import { FaqSection } from "@/components/about/faq-section";
import { getServiceCategories } from "@/lib/get-service-categories";

export const metadata: Metadata = {
  title: "About",
  description:
    "Full-stack web developer specializing in modern frontends, robust backends, and secure, scalable web applications.",
};

const DEFAULT_BIO =
  "I'm a full-stack web developer who helps businesses grow their online presence — building fast, modern websites, SaaS dashboards, e-commerce platforms, and APIs — end to end. From the first line of frontend code to the database schema powering it, I care about the details that make software feel solid: clean architecture, thoughtful UX, and code that doesn't fall apart six months after launch.\n\nWhether you need a marketing site, a full e-commerce store, or a custom SaaS platform with dashboards and auth, I work directly with you — no account managers, no middlemen — from planning through to launch.\n\nMy approach is simple: understand the problem before writing code, keep you informed at every stage, and ship something you can confidently hand off to any other developer later — well-structured, documented, and free of vendor lock-in.";

export default async function AboutPage() {
  const [settings, projectCount, approvedReviews, serviceCategories, processSteps, faqs] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    prisma.project.count(),
    prisma.review.findMany({ where: { status: "APPROVED" } }),
    getServiceCategories(),
    prisma.processStep.findMany({ orderBy: { order: "asc" } }),
    prisma.faqItem.findMany({ orderBy: { order: "asc" } }),
  ]);

  const bioParagraphs = (settings?.aboutBio ?? DEFAULT_BIO)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const computedAverageRating =
    approvedReviews.length > 0
      ? approvedReviews.reduce((sum, review) => sum + review.rating, 0) / approvedReviews.length
      : null;
  const averageRating = settings?.averageRatingOverride ?? computedAverageRating;

  return (
    <div className="py-20">
      <Container className="max-w-4xl">
        <SectionHeading eyebrow="About Me" title="Hi, I'm Ugochukwu Chukwu Christian" align="left" />
        {bioParagraphs.map((paragraph, index) => (
          <p key={index} className={index === 0 ? "mt-6 text-lg text-foreground/70" : "mt-4 text-lg text-foreground/70"}>
            {paragraph}
          </p>
        ))}
      </Container>

      <Container className="mt-16">
        <AboutStats
          stats={{
            projectsDelivered: settings?.projectsDeliveredOverride ?? projectCount,
            clientReviews: settings?.clientReviewsOverride ?? approvedReviews.length,
            serviceCategories: settings?.serviceCategoriesOverride ?? serviceCategories.length,
            averageRating,
          }}
        />
      </Container>

      <Container className="mt-20">
        <SectionHeading title="Why work with me" align="left" />
        <div className="mt-8">
          <ValueProps />
        </div>
      </Container>

      <Container className="mt-20 max-w-4xl">
        <SectionHeading title="Tech I work with" align="left" />
        <div className="mt-6">
          <TechGrid />
        </div>
      </Container>

      <Container className="mt-20">
        <SectionHeading title="How I work" align="left" />
        <div className="mt-8">
          <ProcessStepsGrid steps={processSteps} />
        </div>
      </Container>

      <Container className="mt-20">
        <SectionHeading
          eyebrow="FAQ"
          title="Common questions"
          description="Everything most clients ask before we start working together."
        />
        <div className="mt-10">
          <FaqSection faqs={faqs} />
        </div>
      </Container>

      <Container className="mt-20 max-w-4xl">
        <div className="glass-panel group relative overflow-hidden flex flex-col items-start gap-4 rounded-2xl p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-bold">Have a project in mind?</h3>
            <p className="mt-1 text-sm text-foreground/70">
              Browse services or head straight to booking a chat.
            </p>
          </div>
          <Link
            href="/services"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/40"
          >
            View Services
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </Container>
    </div>
  );
}
