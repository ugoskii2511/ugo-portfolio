import { prisma } from "@/lib/db";

export async function getAnalyticsSummary() {
  const [totalPageViews, totalBookingClicks, pendingReviews, activeAnnouncements, totalBookings] =
    await Promise.all([
      prisma.analyticsEvent.count({ where: { type: "PAGE_VIEW" } }),
      prisma.analyticsEvent.count({ where: { type: "BOOKING_CLICK" } }),
      prisma.review.count({ where: { status: "PENDING" } }),
      prisma.announcement.count({ where: { isActive: true } }),
      prisma.booking.count(),
    ]);

  return {
    totalPageViews,
    totalBookingClicks,
    pendingReviews,
    activeAnnouncements,
    totalBookings,
  };
}

export type DailyPageViews = { date: string; label: string; count: number };

/// Page views bucketed by day for the last `days` days (including today).
/// Buckets in JS rather than a SQL date-trunc — event volume on a personal
/// portfolio is small enough that this is simpler than raw SQL and stays
/// portable across Postgres versions.
export async function getPageViewsTimeSeries(days = 14): Promise<DailyPageViews[]> {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const events = await prisma.analyticsEvent.findMany({
    where: { type: "PAGE_VIEW", createdAt: { gte: start } },
    select: { createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    buckets.set(day.toDateString(), 0);
  }

  for (const event of events) {
    const key = event.createdAt.toDateString();
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([dateString, count]) => {
    const date = new Date(dateString);
    return {
      date: date.toISOString(),
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    };
  });
}
