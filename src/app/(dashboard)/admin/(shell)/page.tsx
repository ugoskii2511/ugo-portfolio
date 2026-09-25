import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye, FolderKanban, Inbox, Megaphone, MousePointerClick, Star } from "lucide-react";
import {
  getAnalyticsSummary,
  getPageViewsTimeSeries,
  getPeriodComparison,
  getTopPaths,
} from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/stat-card";
import { PageViewsChart } from "@/components/admin/page-views-chart";
import { EmptyState, PageHeader, Panel, PanelHeader, StatusPill, formatRelative } from "@/components/admin/ui";
import { LinkButton } from "@/components/site/button";

export const metadata: Metadata = { title: "Overview" };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function countLeadsThisWeek() {
  return prisma.booking.count({ where: { createdAt: { gte: new Date(Date.now() - WEEK_MS) } } });
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-8 items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-fg"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const [summary, pageViews, viewsTrend, clicksTrend, topPaths, recentBookings, pendingReviews, reviewStats, projectCounts, leadsThisWeek] =
    await Promise.all([
      getAnalyticsSummary(),
      getPageViewsTimeSeries(30),
      getPeriodComparison("PAGE_VIEW", 30),
      getPeriodComparison("BOOKING_CLICK", 30),
      getTopPaths(30, 6),
      prisma.booking.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.review.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 4 }),
      prisma.review.aggregate({ where: { status: "APPROVED" }, _count: { _all: true }, _avg: { rating: true } }),
      Promise.all([prisma.project.count(), prisma.project.count({ where: { featured: true } })]),
      countLeadsThisWeek(),
    ]);

  const [projectCount, featuredCount] = projectCounts;
  const approvedCount = reviewStats._count._all;
  const averageRating = reviewStats._avg.rating;
  const topMax = Math.max(1, ...topPaths.map((p) => p.views));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Control center"
        title="Overview"
        description="Traffic, leads and moderation across ugobuildsweb.name.ng, from the site's own first-party analytics."
        actions={
          <>
            <LinkButton href="/admin/announcements?new=1" variant="secondary" size="sm" arrow={false}>
              New announcement
            </LinkButton>
            <LinkButton href="/admin/projects?new=1" size="sm" arrow={false}>
              New project
            </LinkButton>
          </>
        }
      />

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Page views · 30d"
          value={viewsTrend.current}
          icon={<Eye className="h-4 w-4" />}
          trend={{ ...viewsTrend, period: "30d" }}
        />
        <StatCard
          label="Booking clicks · 30d"
          value={clicksTrend.current}
          icon={<MousePointerClick className="h-4 w-4" />}
          trend={{ ...clicksTrend, period: "30d" }}
        />
        <StatCard
          label="Leads"
          value={summary.totalBookings}
          icon={<Inbox className="h-4 w-4" />}
          detail={leadsThisWeek > 0 ? `${leadsThisWeek} in the last 7 days` : "None in the last 7 days"}
          href="/admin/bookings"
        />
        <StatCard
          label="Reviews"
          value={approvedCount}
          icon={<Star className="h-4 w-4" />}
          tone={summary.pendingReviews > 0 ? "attention" : "default"}
          detail={
            summary.pendingReviews > 0
              ? `${summary.pendingReviews} awaiting approval`
              : averageRating !== null
                ? `${averageRating.toFixed(1)} average rating`
                : "No approved reviews yet"
          }
          href="/admin/reviews"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <PageViewsChart data={pageViews} />
        </Panel>

        <Panel className="flex flex-col lg:col-span-4">
          <PanelHeader title="Top pages" description="Last 30 days" />
          {topPaths.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">No page views recorded yet.</p>
          ) : (
            <ol className="flex flex-1 flex-col gap-3 px-5 py-4">
              {topPaths.map((row) => (
                <li key={row.path}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-mono text-xs text-fg/90">{row.path}</span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{row.views.toLocaleString()}</span>
                  </div>
                  <div aria-hidden className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full bg-accent/70" style={{ width: `${(row.views / topMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Recent leads" description="From the booking form" action={<PanelLink href="/admin/bookings">Open inbox</PanelLink>} />
          {recentBookings.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={<Inbox className="h-5 w-5" />} title="No leads yet" description="Booking form submissions will land here." />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {recentBookings.map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={`/admin/bookings?lead=${booking.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.025]"
                  >
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-raised-2 text-xs font-medium uppercase text-muted"
                    >
                      {booking.clientName.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{booking.clientName}</span>
                      <span className="block truncate text-xs text-muted">
                        {booking.projectType} · {booking.budget}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-faint">{formatRelative(booking.createdAt.toISOString())}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Moderation queue"
            description="Reviews waiting for approval"
            action={<PanelLink href="/admin/reviews">Moderate</PanelLink>}
          />
          {pendingReviews.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={<Star className="h-5 w-5" />} title="All caught up" description="New client reviews appear here before they go live." />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {pendingReviews.map((review) => (
                <li key={review.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{review.clientName}</p>
                    <span className="shrink-0 font-mono text-xs tracking-[0.15em] text-accent-bright" aria-label={`${review.rating} out of 5`}>
                      {"★".repeat(review.rating)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{review.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel as="section" aria-label="Site status" className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Link href="/admin/projects" className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.025]">
          <FolderKanban className="h-4 w-4 text-faint" aria-hidden />
          <span className="text-sm">
            <span className="font-medium tabular-nums">{projectCount}</span> <span className="text-muted">projects live</span>
          </span>
          <span className="ml-auto">
            <StatusPill tone="accent" dot={false}>
              {featuredCount} featured
            </StatusPill>
          </span>
        </Link>
        <Link href="/admin/announcements" className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.025]">
          <Megaphone className="h-4 w-4 text-faint" aria-hidden />
          <span className="text-sm text-muted">Site banner</span>
          <span className="ml-auto">
            <StatusPill tone={summary.activeAnnouncements > 0 ? "success" : "neutral"}>
              {summary.activeAnnouncements > 0 ? `${summary.activeAnnouncements} active` : "Off"}
            </StatusPill>
          </span>
        </Link>
        <div className="flex items-center gap-3 px-5 py-4">
          <Eye className="h-4 w-4 text-faint" aria-hidden />
          <span className="text-sm">
            <span className="font-medium tabular-nums">{summary.totalPageViews.toLocaleString()}</span>{" "}
            <span className="text-muted">all-time views</span>
          </span>
        </div>
      </Panel>
    </div>
  );
}
