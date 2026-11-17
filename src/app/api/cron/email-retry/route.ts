import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { retryDueEmails } from "@/lib/email/notifications";
import { purgeExpiredRateLimits } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Vercel Cron (see vercel.json) — retries failed/pending order emails with backoff. */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const results = await retryDueEmails();
    await purgeExpiredRateLimits();
    logger.info("email_retry_run", { processed: results.length });
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    logger.error("email_retry_run_failed", { error });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
