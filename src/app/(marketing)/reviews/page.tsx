import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ReviewCard } from "@/components/review-card";
import { ReviewModalTrigger } from "@/components/review-modal-trigger";
import { SectionCta } from "@/components/section-cta";

export const metadata: Metadata = {
  title: "Client Reviews",
  description: "Read what clients say about working with Ugochukwu Chukwu Christian.",
};

export default async function ReviewsPage() {
  const [settings, reviews] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    prisma.review.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const sectionVisible = settings?.reviewsSectionShown ?? true;

  return (
    <div className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Client Reviews"
          title={
            <>
              What clients <span className="italic text-primary">say</span>
            </>
          }
          description="Honest feedback from people I've built websites and platforms for."
        />

        <div className="mt-8 flex justify-center">
          <ReviewModalTrigger />
        </div>

        <div className="mt-16">
          {!sectionVisible ? (
            <p className="text-center text-foreground/60">
              Reviews are temporarily hidden — check back soon.
            </p>
          ) : reviews.length === 0 ? (
            <p className="text-center text-foreground/60">
              No reviews yet — be the first to share your experience!
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
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
          )}
        </div>
        <SectionCta label="Let's get you results worth talking about too." />
      </Container>
    </div>
  );
}
