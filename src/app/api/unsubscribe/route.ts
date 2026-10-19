import { NextRequest, NextResponse } from "next/server";
import { doNotContact, verifyUnsubscribe } from "@/lib/unsubscribe";

/// POST /api/unsubscribe?p=<prospectId>&t=<token>
/// Used by the confirm button on /unsubscribe, and by mail apps' one-click
/// unsubscribe (RFC 8058: POST with body "List-Unsubscribe=One-Click").
/// GET never unsubscribes, so link scanners can't do it by accident.
export async function POST(request: NextRequest) {
  const p = request.nextUrl.searchParams.get("p") ?? undefined;
  const t = request.nextUrl.searchParams.get("t") ?? undefined;
  const oneClick = (await request.text().catch(() => "")).includes("List-Unsubscribe=One-Click");
  if (!verifyUnsubscribe(p, t)) {
    return oneClick ? new NextResponse("Invalid link", { status: 400 }) : NextResponse.redirect(new URL("/unsubscribe?status=invalid", request.url), 303);
  }
  try {
    await doNotContact(p!, "Unsubscribed from email", "unsubscribed");
  } catch (error) {
    console.error("unsubscribe failed", error);
    return oneClick ? new NextResponse("Try again later", { status: 500 }) : NextResponse.redirect(new URL("/unsubscribe?status=error", request.url), 303);
  }
  return oneClick ? new NextResponse(null, { status: 200 }) : NextResponse.redirect(new URL("/unsubscribe?status=done", request.url), 303);
}
