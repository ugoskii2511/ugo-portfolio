import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const STAGES = [
  "DISCOVERED",
  "NEEDS_REVIEW",
  "QUALIFIED",
  "READY_FOR_OUTREACH",
  "CONTACTED",
  "REPLIED",
  "CONSULTATION_SCHEDULED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "DO_NOT_CONTACT",
] as const;
export type Stage = (typeof STAGES)[number];

/// Defence in depth on top of SameSite=Lax cookies: state-changing admin
/// requests must come from this site.
export function rejectCrossOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null; // same-origin fetches from older browsers / server calls
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    // fall through
  }
  return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
}

export async function auditLog(actor: string, action: string, target: string | null, details?: Prisma.InputJsonValue) {
  await prisma.adminAuditLog.create({ data: { actor, action, target, details } });
}

export async function logEvent(prospectId: string, type: string, summary: string, data?: Prisma.InputJsonValue, channel?: string) {
  await prisma.prospectEvent.create({ data: { prospectId, type, summary: summary.slice(0, 500), data, channel } });
}

/// Mirrors crm.sync_follow_up_date in the Python service.
export async function syncFollowUpDate(prospectId: string) {
  const next = await prisma.followUpTask.findFirst({
    where: { prospectId, status: "open" },
    orderBy: { dueAt: "asc" },
    select: { dueAt: true },
  });
  await prisma.prospect.update({ where: { id: prospectId }, data: { followUpAt: next?.dueAt ?? null } });
}

export function stageLabel(stage: string) {
  return stage
    .toLowerCase()
    .split("_")
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function websiteDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}
