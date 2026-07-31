import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession, type AdminSessionPayload } from "@/lib/auth";

/// Reads and verifies the admin session cookie inside a Route Handler or
/// Server Component. Returns null when there is no valid session.
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/// Throws UnauthorizedError when there is no valid admin session. Call at
/// the top of any Route Handler that mutates or exposes non-public data.
export async function requireAdminSession(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
