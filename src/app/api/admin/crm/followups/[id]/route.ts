import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";
import { auditLog, rejectCrossOrigin, syncFollowUpDate } from "@/lib/crm";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  status: z.enum(["done", "skipped", "open"]).optional(),
  dueAt: z.coerce.date().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    const session = await requireAdminSession();
    const { id } = await params;
    const input = schema.parse(await request.json());
    const task = await prisma.followUpTask.findUnique({ where: { id } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await prisma.followUpTask.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status, completedAt: input.status === "done" ? new Date() : null } : {}),
        ...(input.dueAt ? { dueAt: input.dueAt } : {}),
      },
    });
    await syncFollowUpDate(task.prospectId);
    await auditLog(session.email, "followup.update", id, JSON.parse(JSON.stringify(input)));
    return NextResponse.json({ task: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
