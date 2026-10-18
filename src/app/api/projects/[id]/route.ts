import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectPriceProblem, projectSchema } from "@/lib/validations";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";
import { rejectCrossOrigin } from "@/lib/crm";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    await requireAdminSession();
    const { id } = await params;
    const body = await request.json();
    const data = projectSchema.partial().parse(body);

    // Check the custom estimate as it will be after this update.
    if ("priceMinNaira" in data || "priceMaxNaira" in data) {
      const current = await prisma.project.findUnique({ where: { id }, select: { priceMinNaira: true, priceMaxNaira: true } });
      if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const min = "priceMinNaira" in data ? data.priceMinNaira : current.priceMinNaira;
      const max = "priceMaxNaira" in data ? data.priceMaxNaira : current.priceMaxNaira;
      const problem = projectPriceProblem(min, max);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    }

    const project = await prisma.project.update({ where: { id }, data });
    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    await requireAdminSession();
    const { id } = await params;

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
