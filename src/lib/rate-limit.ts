import "server-only";

/**
 * Best-effort in-memory fixed-window rate limiter (no database). On serverless hosting each
 * instance keeps its own counters, so limits are approximate — enough to stop casual abuse and
 * accidental floods of order emails. For strict global limits, put Vercel Firewall / Cloudflare
 * rate-limiting rules in front of /api/*.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  let b = buckets.get(key);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + windowSeconds * 1000 };
    buckets.set(key, b);
  }
  b.count++;
  return { allowed: b.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
}
