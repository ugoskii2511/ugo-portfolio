import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/apiError";
import { isRateLimited } from "@/lib/rateLimit";
import { callProspector, ProspectorError } from "@/lib/prospector";

/// Public "free website audit" request. The request lands in the admin CRM
/// as an inbound prospect; any audit is run and reviewed by a person before
/// anything is sent back.
const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  businessName: z.string().trim().min(2, "Please enter your business name").max(200),
  email: z.string().trim().email("Please enter a valid email").max(200),
  phone: z.string().trim().max(60).optional().or(z.literal("")),
  website: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
    .refine((v) => !v || z.string().url().safeParse(v).success, "Please enter a valid website address"),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  consent: z.literal(true, { message: "Please agree so I can contact you about your audit" }),
  honeypot: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (await isRateLimited(request, "audit-request", 3, 30 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
    const { honeypot, ...data } = schema.parse(await request.json());
    if (honeypot) return NextResponse.json({ ok: true }, { status: 201 });

    await callProspector("/inbound/audit-request", {
      method: "POST",
      actor: "public-form",
      timeoutMs: 20000,
      body: {
        name: data.name,
        businessName: data.businessName,
        email: data.email,
        phone: data.phone || null,
        website: data.website || null,
        message: data.message || null,
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ProspectorError) {
      console.error("audit-request: prospector error", error.status, error.message);
      return NextResponse.json(
        { error: "Requests can't be received right now. Please use the contact page or WhatsApp instead." },
        { status: 503 }
      );
    }
    return handleApiError(error);
  }
}
