import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";
import { auditLog, rejectCrossOrigin } from "@/lib/crm";
import { DEFAULT_DISCLAIMER, PACKAGE_ORDER, validatePricingConfig, type PricingConfig } from "@/lib/pricing";

const naira = z.coerce.number().int().min(0).max(1_000_000_000);
const schema = z.object({
  config: z.object({
    packages: z.record(
      z.enum(PACKAGE_ORDER as [string, ...string[]]),
      z.object({ label: z.string().trim().min(1).max(80), min: naira, max: naira.nullable() })
    ),
    domain: z.object({ min: naira, max: naira }),
    hosting: z.object({ min: naira, max: naira }),
    maintenanceFrom: naira,
  }),
  /// Empty or null resets to the default wording.
  disclaimer: z.string().trim().max(3000).nullable(),
});

/// Central pricing: package ranges, running costs and the disclaimer text.
export async function PUT(request: NextRequest) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    const session = await requireAdminSession();
    const input = schema.parse(await request.json());
    const config = input.config as unknown as PricingConfig;
    const problems = validatePricingConfig(config);
    if (problems.length) return NextResponse.json({ error: problems[0], problems }, { status: 400 });
    const disclaimer = input.disclaimer && input.disclaimer !== DEFAULT_DISCLAIMER ? input.disclaimer : null;
    await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", pricingConfig: config, pricingDisclaimer: disclaimer },
      update: { pricingConfig: config, pricingDisclaimer: disclaimer },
    });
    await auditLog(session.email, "pricing.update", "singleton", { disclaimerCustom: disclaimer !== null });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
