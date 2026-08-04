import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// DB-backed fixed-window limiter, keyed by "route:ip". Serverless deployments
// (Vercel) don't guarantee shared memory across invocations, so an in-memory
// Map can't be trusted to persist counts between requests the way it could
// on a single persistent server. Not a substitute for a proper store like
// Redis under real load — just enough to blunt naive bot abuse of public
// write endpoints.
export async function isRateLimited(
  request: NextRequest,
  routeKey: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${routeKey}:${ip}`;
  const now = new Date();

  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });

  if (!bucket || bucket.resetAt < now) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, resetAt: new Date(now.getTime() + windowMs) },
      update: { count: 1, resetAt: new Date(now.getTime() + windowMs) },
    });
    return false;
  }

  const updated = await prisma.rateLimitBucket.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  return updated.count > limit;
}
