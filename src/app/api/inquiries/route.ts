import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectInquirySchema } from "@/lib/validations";
import { handleApiError } from "@/lib/apiError";
import { isRateLimited } from "@/lib/rateLimit";
import { buildBookingWhatsAppUrl } from "@/lib/whatsapp";

/// "Discuss a similar project" enquiries. Saved as a lead (Booking row) so
/// they appear on Admin → Leads with everything else. Contact details are
/// only ever readable there, behind the admin login.
export async function POST(request: NextRequest) {
  try {
    if (await isRateLimited(request, "inquiries", 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 });
    }
    const { honeypot, ...data } = projectInquirySchema.parse(await request.json());
    // Bots that fill the hidden field get a normal-looking response and nothing is stored.
    if (honeypot) return NextResponse.json({ ok: true }, { status: 201 });

    const details = [
      data.sourceProject && `Saw: ${data.sourceProject}`,
      data.deadline && `Deadline: ${data.deadline}`,
      data.features && `Features needed:\n${data.features}`,
      data.details && `More details:\n${data.details}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { whatsappNumber: true } });
    const whatsappUrl = buildBookingWhatsAppUrl(
      { name: data.clientName, projectType: data.projectType, budget: data.budget, details: details || "I'd like to discuss a project." },
      settings?.whatsappNumber
    );

    await prisma.booking.create({
      data: {
        source: "project-inquiry",
        clientName: data.clientName,
        email: data.email,
        phone: data.phone,
        projectType: data.projectType,
        budget: data.budget,
        deadline: data.deadline || null,
        features: data.features || null,
        details: details || "(no extra details)",
        sourceProject: data.sourceProject || null,
        estimateAcknowledged: data.estimateAcknowledged,
        whatsappUrl,
      },
    });
    return NextResponse.json({ ok: true, whatsappUrl }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
