import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { adminRoute, BusinessError } from "@/lib/business-api";
import { auditLog } from "@/lib/crm";
import { LEAD_STATUSES } from "@/lib/solutions";

type Params = { params: Promise<{ id: string }> };

const schema = z
  .object({
    status: z.enum(LEAD_STATUSES).optional(),
    adminNotes: z.string().trim().max(5000).nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.adminNotes !== undefined, { message: "Nothing to update" });

/// Update a lead's status or private notes (admin only, logged).
export function PATCH(request: NextRequest, { params }: Params) {
  return adminRoute(request, async (session) => {
    const { id } = await params;
    const input = schema.parse(await request.json());
    const before = await prisma.booking.findUnique({ where: { id }, select: { status: true, adminNotes: true } });
    if (!before) throw new BusinessError("Lead not found", 404);
    const statusChanged = input.status !== undefined && input.status !== before.status;
    await prisma.booking.update({
      where: { id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(statusChanged ? { statusUpdatedAt: new Date() } : {}),
        ...(input.adminNotes !== undefined ? { adminNotes: input.adminNotes || null } : {}),
      },
    });
    await auditLog(session.email, "lead.update", id, {
      ...(statusChanged ? { from: before.status, to: input.status } : {}),
      ...(input.adminNotes !== undefined ? { notesChanged: true } : {}),
    });
    return NextResponse.json({ ok: true });
  });
}
