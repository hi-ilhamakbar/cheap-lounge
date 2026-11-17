import "server-only";
import { prisma } from "./db";
import { logger } from "./logger";

/**
 * Fixed-window rate limiter stored in PostgreSQL, so limits hold across serverless instances.
 * A single atomic upsert per request. If the DB is unreachable we fail open (and log) rather than
 * block customers — the database outage itself will surface elsewhere.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  try {
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, NOW() + make_interval(secs => ${windowSeconds}))
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimit"."resetAt" < NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" < NOW() THEN NOW() + make_interval(secs => ${windowSeconds}) ELSE "RateLimit"."resetAt" END
      RETURNING "count", "resetAt"`;
    const row = rows[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000));
    return { allowed: row.count <= limit, retryAfterSeconds };
  } catch (error) {
    logger.error("rate_limit_failed", { key, error });
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/** Occasionally clean expired counters (called from the cron job). */
export async function purgeExpiredRateLimits() {
  await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 3600_000) } } });
}
