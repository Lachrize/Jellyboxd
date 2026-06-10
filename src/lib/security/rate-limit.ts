/**
 * Minimal in-memory sliding-window rate limiter. Jellyboxd is a single-instance
 * self-hosted app, so a process-local map is enough — no Redis required.
 * Resets on restart, which is acceptable for brute-force throttling.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

/** Drop stale keys occasionally so the map can't grow unbounded. */
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Record an attempt for `key` and report whether it is within `limit` per
 * `windowMs`. Returns `allowed: false` once the window is saturated.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const retryAfterMs = windowMs - (now - bucket.hits[0]!);
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterMs: 0 };
}

/** Clear a key after a successful auth so good users aren't penalised. */
export function rateLimitReset(key: string) {
  buckets.delete(key);
}
