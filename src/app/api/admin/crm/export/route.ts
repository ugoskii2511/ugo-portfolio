import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";
import { auditLog, STAGES } from "@/lib/crm";

const COLUMNS = [
  "businessName", "industry", "category", "city", "state", "country", "website", "websiteStatus",
  "phone", "email", "stage", "score", "qualification", "recommendedService", "followUpAt",
  "proposalAmount", "wonAmount", "source", "sourceUrl", "sourceLicense", "discoveredAt",
] as const;

function cell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text = value instanceof Date ? value.toISOString() : String(value);
  // Neutralise spreadsheet formulas (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/// CSV export of prospects (filtered by stage if given). Every export is
/// recorded in the admin audit log. Archived prospects are excluded unless
/// requested; do-not-contact rows are included so the list stays complete.
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const stage = request.nextUrl.searchParams.get("stage");
    const includeArchived = request.nextUrl.searchParams.get("archived") === "1";
    const where = {
      ...(stage && (STAGES as readonly string[]).includes(stage) ? { stage: stage as (typeof STAGES)[number] } : {}),
      ...(includeArchived ? {} : { archivedAt: null }),
    };
    const rows = await prisma.prospect.findMany({ where, orderBy: { discoveredAt: "desc" }, take: 5000 });
    const csv = [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(","))].join("\n");
    await auditLog(session.email, "prospect.export", null, { count: rows.length, stage, includeArchived });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="prospects-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
