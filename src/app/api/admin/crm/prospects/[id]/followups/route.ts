import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";
import { auditLog, rejectCrossOrigin, syncFollowUpDate } from "@/lib/crm";

type Params = { params: Promise<{ id: string }> };

/// Manual follow-up reminder for a prospect.
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    const session = await requireAdminSession();
    const { id: prospectId } = await params;
    const input = z.object({ title: z.string().trim().min(1).max(200), dueAt: z.coerce.date() }).parse(await request.json());
    const prospect = await prisma.prospect.findUnique({ where: { id: prospectId }, select: { doNotContact: true } });
    if (!prospect) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (prospect.doNotContact) {
      return NextResponse.json({ error: "This prospect is on the do-not-contact list." }, { status: 400 });
    }
    const task = await prisma.followUpTask.create({ data: { prospectId, title: input.title, dueAt: input.dueAt } });
    await syncFollowUpDate(prospectId);
    await auditLog(session.email, "followup.create", task.id, { prospectId });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
