import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { siteSettingsSchema } from "@/lib/validations";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";

async function getOrCreateSettings() {
  return prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export async function GET() {
  try {
    const settings = await getOrCreateSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const data = siteSettingsSchema.parse(body);

    const settings = await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}
