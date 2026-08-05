import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processStepSchema } from "@/lib/validations";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const steps = await prisma.processStep.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json({ steps });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const data = processStepSchema.parse(body);

    const step = await prisma.processStep.create({ data });
    return NextResponse.json({ step }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
