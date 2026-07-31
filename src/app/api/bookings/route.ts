import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bookingSchema } from "@/lib/validations";
import { buildBookingWhatsAppUrl } from "@/lib/whatsapp";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(request, "bookings", 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { honeypot, ...data } = bookingSchema.parse(body);

    if (honeypot) {
      // Bot detected — pretend success without touching the database.
      return NextResponse.json({ booking: null, whatsappUrl: "" }, { status: 201 });
    }

    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    const whatsappUrl = buildBookingWhatsAppUrl(
      {
        name: data.clientName,
        projectType: data.projectType,
        budget: data.budget,
        details: data.details,
      },
      settings?.whatsappNumber
    );

    const booking = await prisma.booking.create({
      data: { ...data, whatsappUrl },
    });

    return NextResponse.json({ booking, whatsappUrl }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    await requireAdminSession();
    const bookings = await prisma.booking.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ bookings });
  } catch (error) {
    return handleApiError(error);
  }
}
