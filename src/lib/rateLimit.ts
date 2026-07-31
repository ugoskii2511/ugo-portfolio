import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

// Simple in-memory fixed-window limiter. Enough to blunt naive bot abuse of
// public write endpoints on this single-instance deployment — not a
// substitute for a shared store (Redis) if this ever runs multi-instance.
const buckets = new Map<string, Bucket>();

export function isRateLimited(
  request: NextRequest,
  routeKey: string,
  limit: number,
  windowMs: number
): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bucketKey = `${routeKey}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}
