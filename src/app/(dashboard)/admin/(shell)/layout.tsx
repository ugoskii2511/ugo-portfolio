import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/authGuard";
import { prisma } from "@/lib/db";
import { AdminShell, type ShellNotifications } from "@/components/admin/sidebar";
import { AdminProviders } from "@/components/admin/providers";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/// Real, cheap signals for the top bar: reviews awaiting moderation and
/// leads from the last 7 days. No read/unread state exists in the schema, so
/// "new" simply means recent.
async function getShellNotifications(): Promise<ShellNotifications> {
  const since = new Date(Date.now() - WEEK_MS);
  const [pendingReviews, pendingReviewCount, recentLeads, recentLeadCount] = await Promise.all([
    prisma.review.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, clientName: true, createdAt: true },
    }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.booking.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, clientName: true, projectType: true, createdAt: true },
    }),
    prisma.booking.count({ where: { createdAt: { gte: since } } }),
  ]);
  return {
    pendingReviews: pendingReviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    pendingReviewCount,
    recentLeads: recentLeads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    recentLeadCount,
  };
}

export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy (src/proxy.ts) already guards /admin/* at the edge; this check
  // is defense in depth in case the route is ever reached without it.
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const notifications = await getShellNotifications();

  return (
    <AdminProviders>
      <AdminShell email={session.email} notifications={notifications}>
        {children}
      </AdminShell>
    </AdminProviders>
  );
}
