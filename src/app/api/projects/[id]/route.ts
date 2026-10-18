import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectSchema } from "@/lib/validations";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = await request.json();
    const data = projectSchema.partial().parse(body);

    const project = await prisma.project.update({ where: { id }, data });
    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
