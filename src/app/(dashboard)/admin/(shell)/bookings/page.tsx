import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { BookingsTable } from "@/components/admin/bookings-table";

export const metadata: Metadata = { title: "Bookings" };

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Booking Leads</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Every service inquiry submitted through the booking form.
        </p>
      </div>

      <BookingsTable
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
