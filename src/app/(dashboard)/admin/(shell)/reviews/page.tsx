import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ReviewsManager } from "@/components/admin/reviews-manager";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const [reviews, settings] = await Promise.all([
    prisma.review.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.siteSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    }),
  ]);

  return (
    <ReviewsManager
      reviewsSectionShown={settings.reviewsSectionShown}
      reviewLink={`${SITE_URL}/review`}
      reviews={reviews.map((review) => ({
        id: review.id,
        clientName: review.clientName,
        position: review.position,
        rating: review.rating,
        message: review.message,
        status: review.status,
        createdAt: review.createdAt.toISOString(),
      }))}
    />
  );
}
