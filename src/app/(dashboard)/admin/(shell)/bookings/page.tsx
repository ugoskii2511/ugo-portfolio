import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { BookingsTable } from "@/components/admin/bookings-table";
import { PageHeader } from "@/components/admin/ui";
import { describeAnswers } from "@/lib/enquiry-schema";
import { formatNaira, type Estimate } from "@/lib/solution-estimate";

function estimateSummary(answers: unknown): string | null {
  const est = answers && typeof answers === "object" ? (answers as { estimate?: Estimate }).estimate : undefined;
  if (!est) return null;
  return `${est.scope} scope${est.range ? ` · ${formatNaira(est.range.low)} – ${formatNaira(est.range.high)} shown` : " · no price shown"}`;
}

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
        description="Every project brief and Business Solutions enquiry from your site. Track each one from new to completed."
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
          source: booking.source,
          service: booking.service,
          businessName: booking.businessName,
          email: booking.email,
          phone: booking.phone,
          timeline: booking.deadline,
          requirements: booking.service && booking.answers && typeof booking.answers === "object" ? describeAnswers(booking.service, booking.answers as Record<string, unknown>) : [],
          estimate: estimateSummary(booking.answers),
          status: booking.status,
          adminNotes: booking.adminNotes,
        }))}
      />
    </div>
  );
}
