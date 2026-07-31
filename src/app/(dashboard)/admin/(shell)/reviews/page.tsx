import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ReviewsManager } from "@/components/admin/reviews-manager";

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
      reviews={reviews.map((review) => ({
        id: review.id,
        clientName: review.clientName,
        rating: review.rating,
        message: review.message,
        status: review.status,
        createdAt: review.createdAt.toISOString(),
      }))}
    />
  );
}
