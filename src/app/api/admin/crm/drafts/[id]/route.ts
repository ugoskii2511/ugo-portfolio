import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";
import { auditLog, logEvent, rejectCrossOrigin } from "@/lib/crm";

type Params = { params: Promise<{ id: string }> };

const schema = z
  .object({
    subject: z.string().trim().max(200).nullable(),
    body: z.string().trim().min(1).max(8000),
    action: z.enum(["approve", "reject", "reopen"]),
  })
  .partial();

/// Edit, approve or reject a draft. Logging a draft as *sent* goes through
/// the prospector service, which enforces do-not-contact and schedules
/// follow-ups.
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    const session = await requireAdminSession();
    const { id } = await params;
    const input = schema.parse(await request.json());
    const draft = await prisma.outreachDraft.findUnique({ where: { id }, include: { prospect: { select: { doNotContact: true } } } });
    if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (draft.status === "sent") {
      return NextResponse.json({ error: "This draft has already been sent and can't be changed." }, { status: 400 });
    }
    if (input.action === "approve" && draft.prospect.doNotContact) {
      return NextResponse.json({ error: "This prospect is on the do-not-contact list." }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (input.body !== undefined) data.body = input.body;
    if (input.subject !== undefined) data.subject = input.subject || null;
    if (input.action === "approve") Object.assign(data, { status: "approved", approvedAt: new Date() });
    if (input.action === "reject") Object.assign(data, { status: "rejected", approvedAt: null });
    // Editing an approved draft sends it back for approval.
    if (input.action === "reopen" || (draft.status === "approved" && (input.body !== undefined || input.subject !== undefined) && !input.action)) {
      Object.assign(data, { status: "draft", approvedAt: null });
    }

    const updated = await prisma.outreachDraft.update({ where: { id }, data });
    if (input.action) {
      await logEvent(draft.prospectId, `draft_${input.action}`, `Draft ${input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "reopened"}`, { draftId: id, by: session.email });
    }
    await auditLog(session.email, `draft.${input.action ?? "edit"}`, id);
    return NextResponse.json({ draft: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
