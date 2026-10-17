import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";
import { auditLog, logEvent, rejectCrossOrigin, STAGES, stageLabel, websiteDomain } from "@/lib/crm";

type Params = { params: Promise<{ id: string }> };

const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((v) => /^https?:\/\//i.test(v), "Must start with http:// or https://");

const patchSchema = z
  .object({
    // Do-not-contact goes through its own endpoint (it also suppresses
    // contact details), so it can't be set as a plain stage here.
    stage: z.enum(STAGES).exclude(["DO_NOT_CONTACT"]),
    priority: z.number().int().min(0).max(2),
    followUpAt: z.coerce.date().nullable(),
    proposalAmount: z.number().int().min(0).max(1_000_000_000).nullable(),
    wonAmount: z.number().int().min(0).max(1_000_000_000).nullable(),
    outcomeReason: z.string().trim().max(500).nullable(),
    scoreOverride: z.number().int().min(0).max(100).nullable(),
    archived: z.boolean(),
    businessName: z.string().trim().min(1).max(200),
    email: z.union([z.string().trim().email().max(200), z.literal("")]).nullable(),
    phone: z.string().trim().max(60).nullable(),
    website: z.union([httpUrl, z.literal("")]).nullable(),
    industry: z.string().trim().max(80).nullable(),
    city: z.string().trim().max(100).nullable(),
  })
  .partial();

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    const session = await requireAdminSession();
    const { id } = await params;
    const input = patchSchema.parse(await request.json());
    const current = await prisma.prospect.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { archived, website, email, ...rest } = input;
    const data: Record<string, unknown> = { ...rest };
    if (archived !== undefined) data.archivedAt = archived ? new Date() : null;
    if (email !== undefined) data.email = email || null;
    if (website !== undefined) {
      data.website = website || null;
      data.websiteDomain = websiteDomain(website || null);
      // A changed website must be re-checked before it's trusted.
      data.websiteStatus = website ? "UNCHECKED" : "NONE_FOUND";
      data.websiteEvidence = website ? null : "Website removed manually.";
      data.websiteCheckedAt = null;
    }
    if (input.stage && current.doNotContact) {
      return NextResponse.json({ error: "This prospect is on the do-not-contact list." }, { status: 400 });
    }

    const updated = await prisma.prospect.update({ where: { id }, data });
    if (input.stage && input.stage !== current.stage) {
      await logEvent(id, "stage_change", `Stage: ${stageLabel(current.stage)} → ${stageLabel(input.stage)}`, { from: current.stage, to: input.stage, by: session.email });
      if (["REPLIED", "WON", "LOST"].includes(input.stage)) {
        await prisma.followUpTask.updateMany({ where: { prospectId: id, status: "open" }, data: { status: "skipped" } });
        await prisma.prospect.update({ where: { id }, data: { followUpAt: null } });
      }
    }
    if (archived !== undefined) {
      await logEvent(id, archived ? "archived" : "unarchived", archived ? "Archived" : "Restored from archive");
    }
    await auditLog(session.email, "prospect.update", id, JSON.parse(JSON.stringify(input)));
    return NextResponse.json({ prospect: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

/// Permanent deletion (data-deletion requests). Do-not-contact suppressions
/// are kept so the business isn't rediscovered and contacted again.
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    const session = await requireAdminSession();
    const { id } = await params;
    const current = await prisma.prospect.findUnique({ where: { id }, select: { businessName: true } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.prospect.delete({ where: { id } });
    await auditLog(session.email, "prospect.delete", id, { businessName: current.businessName });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
