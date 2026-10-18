import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectSchema } from "@/lib/validations";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ projects });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const data = projectSchema.parse(body);

    const project = await prisma.project.create({ data });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
