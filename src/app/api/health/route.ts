import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { providerMode } from "@/lib/lounges/service";

export const dynamic = "force-dynamic";

/** Liveness/readiness probe. Reports configuration presence only — never secret values. */
export async function GET() {
  let database = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }
  return NextResponse.json(
    {
      ok: database === "ok",
      database,
      loungeProvider: providerMode(),
      email: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "configured" : "not_configured",
    },
    { status: database === "ok" ? 200 : 503 },
  );
}
