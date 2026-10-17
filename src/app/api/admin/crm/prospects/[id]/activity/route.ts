import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";
import { auditLog, logEvent, rejectCrossOrigin } from "@/lib/crm";

type Params = { params: Promise<{ id: string }> };

/// Notes and manually logged interactions (replies, calls, meetings…).
/// Recording a reply moves a contacted lead to "Replied" and stops its
/// follow-up reminders.
const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("note"), body: z.string().trim().min(1).max(5000) }),
  z.object({
    kind: z.literal("interaction"),
    type: z.enum(["reply", "call", "meeting", "proposal", "message", "other"]),
    channel: z.enum(["email", "whatsapp", "phone", "in_person", "other"]).optional(),
    summary: z.string().trim().min(1).max(500),
  }),
]);

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    const session = await requireAdminSession();
    const { id } = await params;
    const input = schema.parse(await request.json());
    const prospect = await prisma.prospect.findUnique({ where: { id }, select: { stage: true } });
    if (!prospect) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (input.kind === "note") {
      const note = await prisma.prospectNote.create({ data: { prospectId: id, body: input.body } });
      await auditLog(session.email, "prospect.note", id);
      return NextResponse.json({ note }, { status: 201 });
    }

    await logEvent(id, input.type, input.summary, { by: session.email, manual: true }, input.channel);
    if (input.type === "reply" && prospect.stage === "CONTACTED") {
      await prisma.prospect.update({ where: { id }, data: { stage: "REPLIED", followUpAt: null } });
      await prisma.followUpTask.updateMany({ where: { prospectId: id, status: "open" }, data: { status: "skipped" } });
      await logEvent(id, "stage_change", "Stage: Contacted → Replied", { from: "CONTACTED", to: "REPLIED" });
    }
    await auditLog(session.email, `prospect.interaction.${input.type}`, id);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
