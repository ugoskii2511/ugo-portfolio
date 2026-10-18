import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { BookingsTable } from "@/components/admin/bookings-table";
import { PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Leads" };

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const [{ lead }, bookings] = await Promise.all([
    searchParams,
    prisma.booking.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Inbox"
        title="Leads"
        description="Every project brief submitted through the booking form on your site."
      />
      <BookingsTable
        key={lead ?? "all"}
        initialSelectedId={lead}
        bookings={bookings.map((booking) => ({
          id: booking.id,
          clientName: booking.clientName,
          budget: booking.budget,
          projectType: booking.projectType,
          details: booking.details,
          whatsappUrl: booking.whatsappUrl,
          createdAt: booking.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
