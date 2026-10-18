import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";
import { rejectCrossOrigin } from "@/lib/crm";
import type { AdminSessionPayload } from "@/lib/auth";

/// A request the admin can fix (bad reference, possible duplicate…).
export class BusinessError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly extra: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

/// Every business API handler goes through here: same-origin check for
/// writes, a verified admin session on the server, and uniform errors.
export async function adminRoute(
  request: NextRequest,
  handler: (session: AdminSessionPayload) => Promise<NextResponse | Response>
) {
  try {
    if (request.method !== "GET") {
      const blocked = rejectCrossOrigin(request);
      if (blocked) return blocked;
    }
    const session = await requireAdminSession();
    return await handler(session);
  } catch (error) {
    if (error instanceof BusinessError) {
      return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    return handleApiError(error);
  }
}

export function dayToDate(day: string | null): Date | null {
  return day ? new Date(`${day}T00:00:00Z`) : null;
}

export function bigOrNull(kobo: number | null): bigint | null {
  return kobo === null ? null : BigInt(kobo);
}

/// JSON-safe copy of a row for the audit log (BigInt → string, Date → ISO).
export function auditSnapshot(row: object | null): Record<string, unknown> | null {
  if (!row) return null;
  return JSON.parse(JSON.stringify(row, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}
