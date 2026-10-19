import { createHmac, timingSafeEqual } from "node:crypto";

/// Unsubscribe links in automatic outreach emails are signed by the
/// prospector (prospector/app/mailer.py) with OUTREACH_SECRET:
/// token = first 32 hex chars of HMAC-SHA256(secret, "unsub:<prospectId>").
/// Both sides must stay identical; tests/unsubscribe.test.ts checks it.

export function unsubscribeToken(prospectId: string, secret = process.env.OUTREACH_SECRET): string | null {
  if (!secret) return null;
  return createHmac("sha256", secret).update(`unsub:${prospectId}`).digest("hex").slice(0, 32);
}

export function verifyUnsubscribe(prospectId: string | undefined, token: string | undefined, secret = process.env.OUTREACH_SECRET): boolean {
  if (!prospectId || !token || !/^[a-z0-9]{10,40}$/i.test(prospectId) || !/^[a-f0-9]{32}$/.test(token)) return false;
  const expected = unsubscribeToken(prospectId, secret);
  if (!expected) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
