import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientFields } from "@/lib/business-schemas";
import { adminRoute, auditSnapshot, BusinessError } from "@/lib/business-api";
import { auditLog } from "@/lib/crm";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.union([clientFields, z.object({ restore: z.literal(true) })]);

export function PATCH(request: NextRequest, { params }: Params) {
  return adminRoute(request, async (session) => {
    const { id } = await params;
    const input = patchSchema.parse(await request.json());
    const before = await prisma.client.findUnique({ where: { id } });
    if (!before) throw new BusinessError("Client not found", 404);
    if ("restore" in input) {
      await prisma.client.update({ where: { id }, data: { deletedAt: null } });
      await auditLog(session.email, "business.client.restore", id);
      return NextResponse.json({ ok: true });
    }
    if (before.deletedAt) throw new BusinessError("Restore this client before editing it.");
    const after = await prisma.client.update({ where: { id }, data: input });
    await auditLog(session.email, "business.client.update", id, auditSnapshot({ before, after }) as never);
    return NextResponse.json({ ok: true });
  });
}

/// Soft delete: the client, its projects and payments drop out of every list
/// and total, but nothing is erased and it can be restored.
export function DELETE(request: NextRequest, { params }: Params) {
  return adminRoute(request, async (session) => {
    const { id } = await params;
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new BusinessError("Client not found", 404);
    if (!client.deletedAt) await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
    await auditLog(session.email, "business.client.delete", id, auditSnapshot({ name: client.name }) as never);
    return NextResponse.json({ ok: true });
  });
}
