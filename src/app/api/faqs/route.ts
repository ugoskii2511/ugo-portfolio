import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { faqItemSchema } from "@/lib/validations";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const faqs = await prisma.faqItem.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json({ faqs });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const data = faqItemSchema.parse(body);

    const faq = await prisma.faqItem.create({ data });
    return NextResponse.json({ faq }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
