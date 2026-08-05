import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serviceCategorySchema } from "@/lib/validations";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const categories = await prisma.serviceCategory.findMany({
      orderBy: { order: "asc" },
      include: { services: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const data = serviceCategorySchema.parse(body);

    const category = await prisma.serviceCategory.create({ data });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
