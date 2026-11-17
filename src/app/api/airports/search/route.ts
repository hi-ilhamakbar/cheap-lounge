import { NextResponse, type NextRequest } from "next/server";
import { searchAirports } from "@/lib/lounges/service";
import { jsonError, rateLimitOr429 } from "@/lib/http";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = await rateLimitOr429("airport-search", 60, 60);
  if (limited) return limited;
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ ok: true, airports: [] });
  try {
    const airports = await searchAirports(q);
    return NextResponse.json({ ok: true, airports });
  } catch (error) {
    logger.error("airport_search_failed", { error });
    return jsonError(502, "errors.server");
  }
}
