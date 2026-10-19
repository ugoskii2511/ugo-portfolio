import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { doNotContact } from "@/lib/unsubscribe";

/// Resend delivery events (signed with Svix). A bounce or spam complaint
/// marks the prospect do-not-contact so they're never emailed again.
/// Set RESEND_WEBHOOK_SECRET (whsec_…) from the Resend dashboard.
const TOLERANCE_S = 5 * 60;

function verify(secret: string, id: string, timestamp: string, body: string, signatures: string): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_S) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signatures.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

type ResendEvent = { type?: string; data?: { to?: string[] | string; email_id?: string } };

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const body = await request.text();
  const id = request.headers.get("svix-id") ?? "";
  const timestamp = request.headers.get("svix-timestamp") ?? "";
  const signature = request.headers.get("svix-signature") ?? "";
  if (!id || !verify(secret, id, timestamp, body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const kind = event.type === "email.bounced" ? "bounce" : event.type === "email.complained" ? "complaint" : null;
  if (!kind) return NextResponse.json({ ok: true, ignored: event.type ?? "unknown" });

  const recipients = (Array.isArray(event.data?.to) ? event.data?.to : [event.data?.to]).filter((e): e is string => !!e);
  for (const email of recipients) {
    const prospects = await prisma.prospect.findMany({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
    for (const p of prospects) {
      await doNotContact(
        p.id,
        kind === "bounce" ? `Email bounced (${email})` : `Marked the email as spam (${email})`,
        kind === "bounce" ? "email_bounced" : "spam_complaint"
      );
    }
    // Suppress the address even if it isn't (or is no longer) on a prospect.
    await prisma.suppression.upsert({
      where: { kind_value: { kind: "email", value: email.toLowerCase() } },
      create: { kind: "email", value: email.toLowerCase(), reason: kind === "bounce" ? "Email bounced" : "Spam complaint" },
      update: {},
    });
  }
  return NextResponse.json({ ok: true });
}
