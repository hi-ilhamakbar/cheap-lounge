import { NextResponse } from "next/server";
import { getLoungesForAirport } from "@/lib/lounges/service";
import { jsonError, rateLimitOr429 } from "@/lib/http";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ iata: string }> }) {
  const limited = await rateLimitOr429("lounges", 60, 60);
  if (limited) return limited;
  const { iata } = await params;
  try {
    const result = await getLoungesForAirport(iata);
    const status = result.status === "ok" ? 200 : result.status === "airport_not_found" ? 404 : result.status === "not_configured" ? 503 : 502;
    return NextResponse.json({ ok: result.status === "ok", ...result }, { status });
  } catch (error) {
    logger.error("lounge_list_failed", { iata, error });
    return jsonError(500, "errors.server");
  }
}
