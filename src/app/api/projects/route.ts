import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectPriceProblem, projectSchema } from "@/lib/validations";
import { getAdminSession, requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";
import { rejectCrossOrigin } from "@/lib/crm";

/// Public list for the site; hidden (unpublished) projects only for the admin.
export async function GET() {
  try {
    const admin = await getAdminSession();
    const projects = await prisma.project.findMany({
      where: admin ? {} : { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ projects });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    await requireAdminSession();
    const body = await request.json();
    const data = projectSchema.parse(body);
    const problem = projectPriceProblem(data.priceMinNaira, data.priceMaxNaira);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const project = await prisma.project.create({ data });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
