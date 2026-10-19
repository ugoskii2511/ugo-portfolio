import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";
import { callProspector, ProspectorError } from "@/lib/prospector";
import { rejectCrossOrigin } from "@/lib/crm";

// Job steps can run for up to ~45s on the Python side.
export const maxDuration = 60;

const ID = "[A-Za-z0-9_-]{1,40}";
/// Only these operations can be reached through the bridge.
const ALLOWED: { method: "GET" | "POST" | "PUT"; pattern: RegExp }[] = [
  { method: "POST", pattern: /^jobs$/ },
  { method: "POST", pattern: new RegExp(`^jobs/${ID}/(step|cancel|retry)$`) },
  { method: "POST", pattern: /^prospects$/ },
  { method: "POST", pattern: /^prospects\/import$/ },
  { method: "POST", pattern: new RegExp(`^prospects/${ID}/(score|drafts|do-not-contact)$`) },
  { method: "POST", pattern: new RegExp(`^drafts/${ID}/sent$`) },
  { method: "GET", pattern: /^settings$/ },
  { method: "PUT", pattern: /^settings\/(limits|scoring|followups|retention|audit|outreach|schedules|autosend|autopilot)$/ },
  { method: "GET", pattern: /^outreach\/status$/ },
  { method: "POST", pattern: /^outreach\/run$/ },
  { method: "GET", pattern: /^outreach\/templates$/ },
];

type Params = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, { params }: Params, method: "GET" | "POST" | "PUT") {
  try {
    if (method !== "GET") {
      const blocked = rejectCrossOrigin(request);
      if (blocked) return blocked;
    }
    const session = await requireAdminSession();
    const { path } = await params;
    const joined = path.join("/");
    if (!ALLOWED.some((rule) => rule.method === method && rule.pattern.test(joined))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    let body: unknown;
    if (method !== "GET") {
      const text = await request.text();
      if (text.length > 1_200_000) {
        return NextResponse.json({ error: "Request too large" }, { status: 413 });
      }
      body = text ? JSON.parse(text) : {};
    }
    const data = await callProspector(`/${joined}`, { method, body, actor: session.email });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ProspectorError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    return handleApiError(error);
  }
}

export function GET(request: NextRequest, context: Params) {
  return forward(request, context, "GET");
}
export function POST(request: NextRequest, context: Params) {
  return forward(request, context, "POST");
}
export function PUT(request: NextRequest, context: Params) {
  return forward(request, context, "PUT");
}
