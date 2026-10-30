import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/apiError";
import { isRateLimited } from "@/lib/rateLimit";
import { rejectCrossOrigin } from "@/lib/crm";
import { buildWhatsAppChatUrl } from "@/lib/whatsapp";
import { describeAnswers, optionLabel, parseEnquiry } from "@/lib/enquiry-schema";
import { BUDGET_OPTIONS, TIMELINE_OPTIONS } from "@/lib/solutions";
import { estimate, formatNaira } from "@/lib/solution-estimate";
import type { Complexity } from "@/lib/solution-pricing";

/// Public Business Solutions enquiry. Validated on the server against the
/// service's own questions, rate-limited, honeypot-protected, and stored in
/// the existing Leads inbox (Booking) so it shows up in the admin.
export async function POST(request: NextRequest) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    if (await isRateLimited(request, "enquiries", 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many enquiries from this connection. Please try again in a few minutes." }, { status: 429 });
    }

    const input = parseEnquiry(await request.json());
    if (input.website) {
      // Bot filled the hidden field: accept quietly, store nothing.
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const { solution } = input;
    const est = estimate(solution, input.answers, input.complexity as Complexity);
    const lines = describeAnswers(solution.key, input.answers);
    const budget = optionLabel(BUDGET_OPTIONS, input.budget);
    const timeline = optionLabel(TIMELINE_OPTIONS, input.timeline);

    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { whatsappNumber: true, contactEmail: true } });
    const message = [
      `Hello Ugochukwu, I'm ${input.fullName}${input.businessName ? ` from ${input.businessName}` : ""}.`,
      `I've just sent an enquiry about ${solution.name}.`,
      "",
      ...lines.map((l) => `${l.label}: ${l.value}`),
      `Budget: ${budget}`,
      `Timeline: ${timeline}`,
    ].join("\n");
    const whatsappUrl = buildWhatsAppChatUrl(message, settings?.whatsappNumber);

    const lead = await prisma.booking.create({
      data: {
        source: "solution-enquiry",
        service: solution.key,
        clientName: input.fullName,
        businessName: input.businessName ?? null,
        email: input.email,
        phone: input.phone,
        budget,
        deadline: timeline,
        projectType: solution.name,
        details: [input.description, input.additional && `Additional requirements: ${input.additional}`].filter(Boolean).join("\n\n"),
        features: lines.map((l) => `${l.label}: ${l.value}`).join("\n").slice(0, 4000) || null,
        whatsappUrl,
        estimateAcknowledged: true,
        answers: { ...input.answers, complexity: input.complexity, estimate: est },
      },
      select: { id: true },
    });

    await notify(settings?.contactEmail, {
      id: lead.id,
      subject: `New enquiry: ${solution.name} from ${input.fullName}`,
      body: [
        `${input.fullName}${input.businessName ? ` (${input.businessName})` : ""}`,
        `Email: ${input.email}`,
        `Phone / WhatsApp: ${input.phone}`,
        `Budget: ${budget} · Timeline: ${timeline}`,
        `Scope: ${est.scope}${est.range ? ` · Estimate shown: ${formatNaira(est.range.low)} – ${formatNaira(est.range.high)}` : ""}`,
        "",
        ...lines.map((l) => `${l.label}: ${l.value}`),
        "",
        input.description,
        input.additional ? `\nAdditional requirements: ${input.additional}` : "",
      ].join("\n"),
      replyTo: input.email,
    });

    return NextResponse.json({ ok: true, whatsappUrl }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/// Emails the site owner when Resend is configured. Never blocks or fails
/// the enquiry: it's already safely stored in the Leads inbox.
async function notify(to: string | null | undefined, mail: { id: string; subject: string; body: string; replyTo: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.OUTREACH_FROM;
  if (!key || !from || !to) return;
  try {
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: mail.replyTo,
        subject: mail.subject,
        text: `${mail.body}\n\nOpen in the admin: ${site}/admin/bookings?lead=${mail.id}`,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    console.error("enquiry notification failed", error);
  }
}
