import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminLoginSchema } from "@/lib/validations";
import { adminSessionCookieOptions, signAdminSession, verifyPassword } from "@/lib/auth";
import { handleApiError } from "@/lib/apiError";
import { isRateLimited } from "@/lib/rateLimit";

// A valid bcrypt hash with no known matching password. Comparing against it
// when the email isn't found keeps failed-login timing consistent, so the
// endpoint can't be used to enumerate whether an admin email exists.
const DUMMY_PASSWORD_HASH =
  "$2b$12$8b0r8jOpCwcZ0fz7YBjRiuLcJg6CyO.XMHfhh6Ba685LFuk27KoAK";

export async function POST(request: NextRequest) {
  try {
    if (await isRateLimited(request, "admin-login", 10, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = adminLoginSchema.parse(body);

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    const passwordValid = await verifyPassword(
      password,
      admin?.passwordHash ?? DUMMY_PASSWORD_HASH
    );

    if (!admin || !passwordValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await signAdminSession({ sub: admin.id, email: admin.email });
    const response = NextResponse.json({ success: true, email: admin.email });
    response.cookies.set(adminSessionCookieOptions.name, token, adminSessionCookieOptions);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
