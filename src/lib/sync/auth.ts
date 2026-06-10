import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Auth for the Jellyboxd <-> Jellyfin plugin endpoints. The plugin authenticates
 * with a single server-wide shared secret (`JELLYBOXD_SYNC_KEY`); individual
 * users are then routed by their `jellyfinUserId` carried in each payload. This
 * is what makes the sync multi-user without a token per person.
 */

/** Pull the raw token out of an `Authorization: Bearer <token>` header. */
export function extractBearer(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const value = /^Bearer\s+(.+)$/i.exec(header.trim())?.[1];
  return value ? value.trim() : null;
}

/** Constant-time string compare that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** True when the request carries the configured shared server key. */
export function isServerAuthorized(req: Request): boolean {
  const expected = process.env.JELLYBOXD_SYNC_KEY?.trim();
  if (!expected || expected.length < 16) return false; // unset/too weak -> deny
  const got = extractBearer(req);
  return got != null && safeEqual(got, expected);
}

/** Generate a fresh, unguessable code (used for one-time claim links). */
export function generateCode(): string {
  return randomBytes(24).toString("base64url");
}
