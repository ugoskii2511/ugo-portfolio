import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { announcementSchema } from "@/lib/validations";
import { getAdminSession, requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  try {
    const wantsAll = request.nextUrl.searchParams.get("all") === "1";
    const session = wantsAll ? await getAdminSession() : null;

    if (session) {
      const announcements = await prisma.announcement.findMany({
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ announcements });
    }

    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ announcements });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const data = announcementSchema.parse(body);

    const announcement = await prisma.announcement.create({ data });
    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
