import { NextResponse } from "next/server";
import { getAnalyticsSummary } from "@/lib/analytics";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    await requireAdminSession();
    const summary = await getAnalyticsSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
