import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serviceItemSchema } from "@/lib/validations";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const data = serviceItemSchema.parse(body);

    const service = await prisma.service.create({ data });
    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
