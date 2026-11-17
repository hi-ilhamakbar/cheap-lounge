import "server-only";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkRateLimit } from "./rate-limit";

/** Error responses carry an i18n key (errors.*) the client translates. */
export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown").slice(0, 64);
}

/** Returns a 429 response when the limit is exceeded, otherwise null. */
export async function rateLimitOr429(bucket: string, limit: number, windowSeconds: number) {
  const ip = await clientIp();
  const res = await checkRateLimit(`${bucket}:${ip}`, limit, windowSeconds);
  if (!res.allowed) {
    return NextResponse.json(
      { ok: false, error: "errors.rateLimited" },
      { status: 429, headers: { "Retry-After": String(res.retryAfterSeconds) } },
    );
  }
  return null;
}
