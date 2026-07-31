import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  Plus,
  Star,
} from "lucide-react";
import { getAnalyticsSummary, getPageViewsTimeSeries } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/stat-card";
import { PageViewsChart } from "@/components/admin/page-views-chart";
import { StarRating } from "@/components/star-rating";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const [summary, pageViews, recentBookings, pendingReviews] = await Promise.all([
    getAnalyticsSummary(),
    getPageViewsTimeSeries(14),
    prisma.booking.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.review.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const periodTotal = pageViews.reduce((sum, day) => sum + day.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics Overview</h1>
          <p className="mt-1 text-sm text-foreground/60">
            A snapshot of activity across your site.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/projects?new=1"
            className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-4 py-2 text-sm font-medium transition hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
          <Link
            href="/admin/announcements?new=1"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary-dark px-4 py-2 text-sm font-medium text-white shadow-md shadow-primary/25 transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Announcement
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard index={0} icon={<Eye className="h-5 w-5" />} label="Total Page Views" value={summary.totalPageViews} />
        <StatCard index={1} icon={<MousePointerClick className="h-5 w-5" />} label="Booking Clicks" value={summary.totalBookingClicks} />
        <StatCard index={2} icon={<MessageSquare className="h-5 w-5" />} label="Total Bookings" value={summary.totalBookings} />
        <StatCard index={3} icon={<Star className="h-5 w-5" />} label="Pending Reviews" value={summary.pendingReviews} />
        <StatCard index={4} icon={<Megaphone className="h-5 w-5" />} label="Active Announcements" value={summary.activeAnnouncements} />
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Page Views</h2>
          <p className="text-sm text-foreground/60">
            <span className="font-semibold text-foreground">{periodTotal.toLocaleString()}</span> in the
            last 14 days
          </p>
        </div>
        <div className="mt-6">
          <PageViewsChart data={pageViews} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent Bookings</h2>
            <Link
              href="/admin/bookings"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary transition hover:text-primary-dark"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 flex flex-col divide-y divide-border-subtle">
            {recentBookings.length === 0 ? (
              <p className="py-6 text-center text-sm text-foreground/50">No booking leads yet.</p>
            ) : (
              recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{booking.clientName}</p>
                    <p className="truncate text-xs text-foreground/60">{booking.projectType}</p>
                  </div>
                  <span className="shrink-0 text-xs text-foreground/50">
                    {new Date(booking.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Pending Reviews</h2>
            <Link
              href="/admin/reviews"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary transition hover:text-primary-dark"
            >
              Moderate
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 flex flex-col divide-y divide-border-subtle">
            {pendingReviews.length === 0 ? (
              <p className="py-6 text-center text-sm text-foreground/50">
                No reviews awaiting approval.
              </p>
            ) : (
              pendingReviews.map((review) => (
                <div key={review.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{review.clientName}</p>
                    <p className="truncate text-xs text-foreground/60">{review.message}</p>
                  </div>
                  <div className="shrink-0">
                    <StarRating value={review.rating} size={14} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
