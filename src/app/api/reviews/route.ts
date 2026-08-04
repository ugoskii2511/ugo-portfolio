import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reviewSubmitSchema } from "@/lib/validations";
import { getAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";
import { isRateLimited } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  try {
    const wantsAll = request.nextUrl.searchParams.get("all") === "1";
    const session = wantsAll ? await getAdminSession() : null;

    const reviews = await prisma.review.findMany({
      where: session ? undefined : { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (await isRateLimited(request, "reviews", 3, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { honeypot, ...data } = reviewSubmitSchema.parse(body);

    if (honeypot) {
      // Bot detected — pretend success without touching the database.
      return NextResponse.json({ review: null }, { status: 201 });
    }

    const review = await prisma.review.create({
      data: { ...data, status: "PENDING" },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
