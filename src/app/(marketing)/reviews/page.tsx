import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Wrap } from "@/components/site/wrap";
import { SectionIntro } from "@/components/site/section-intro";
import { ReviewCard } from "@/components/review-card";
import { ReviewModalTrigger } from "@/components/review-modal-trigger";
import { FinalCta } from "@/components/home/final-cta";
import { DEFAULT_CONTACT_EMAIL, getSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Client reviews",
  description: "What clients say about working with Ugochukwu Chukwu Christian, in their own words.",
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsPage() {
  const [settings, reviews] = await Promise.all([
    getSettings(),
    prisma.review.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const sectionVisible = settings?.reviewsSectionShown ?? true;

  return (
    <>
      <section className="pb-24 pt-16 sm:pb-32 sm:pt-24">
        <Wrap>
          <SectionIntro
            headingLevel={1}
            label="Client reviews"
            title="In their words."
            description="Unedited feedback from people I've built for. Every review is submitted by the client and approved before it appears."
            action={<ReviewModalTrigger />}
          />

          <div className="mt-14 lg:mt-20">
            {!sectionVisible ? (
              <p className="text-muted">Reviews are temporarily hidden. Check back soon.</p>
            ) : reviews.length === 0 ? (
              <p className="text-muted">No reviews yet. If we&apos;ve worked together, you could be the first.</p>
            ) : (
              <ul className="columns-1 gap-4 md:columns-2 lg:columns-3">
                {reviews.map((review, index) => (
                  <ReviewCard
                    key={review.id}
                    index={index}
                    review={{
                      id: review.id,
                      clientName: review.clientName,
                      position: review.position,
                      rating: review.rating,
                      message: review.message,
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </Wrap>
      </section>
      <FinalCta contactEmail={settings?.contactEmail ?? DEFAULT_CONTACT_EMAIL} />
    </>
  );
}
