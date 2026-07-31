import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyticsTrackSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/apiError";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = analyticsTrackSchema.parse(body);

    await prisma.analyticsEvent.create({ data });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
