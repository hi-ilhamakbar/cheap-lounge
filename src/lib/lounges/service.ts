import "server-only";
import { loungeKeyProvider } from "./loungekey";
import { normalizeLounge } from "./normalize";
import { logger } from "../logger";
import { findLocalAirport, searchLocalAirports } from "../airports";
import fileLounges from "../../data/lounges.json";
import type { AirportInfo, LoungeListResult, LoungeView, NormalizedLounge } from "./types";

/** In-memory cache (per server instance) so we don't call the partner API on every page view. */
const FRESH_MS = 60 * 60 * 1000;
const STALE_MAX_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; airport: AirportInfo; lounges: LoungeView[] }>();

export type ProviderMode = "loungekey" | "file" | "none";

export function providerMode(): ProviderMode {
  const p = (process.env.LOUNGE_PROVIDER ?? "").toLowerCase();
  if (p === "loungekey") return loungeKeyProvider.isConfigured() ? "loungekey" : "none";
  if (p === "file") return "file";
  return "none";
}

export function loungeId(iata: string, externalId: string) {
  return `${iata}-${Buffer.from(externalId).toString("base64url")}`;
}

function parseLoungeId(id: string): { iata: string; externalId: string } | null {
  const m = /^([A-Z]{3})-([A-Za-z0-9_-]{1,200})$/.exec(id);
  if (!m) return null;
  return { iata: m[1], externalId: Buffer.from(m[2], "base64url").toString("utf8") };
}

function toView(l: NormalizedLounge, source: LoungeView["source"], at: number): LoungeView {
  const { raw: _raw, ...rest } = l;
  return { ...rest, id: loungeId(l.airportIata, l.externalId), source, fetchedAt: new Date(at).toISOString() };
}

export async function searchAirports(q: string): Promise<AirportInfo[]> {
  if (providerMode() === "loungekey" && loungeKeyProvider.searchAirports) {
    try {
      const remote = await loungeKeyProvider.searchAirports(q);
      if (remote.length) return remote.slice(0, 8);
    } catch (error) {
      logger.warn("loungekey_airport_search_failed_using_reference_data", { error });
    }
  }
  return searchLocalAirports(q);
}

export async function getLoungesForAirport(iataInput: string): Promise<LoungeListResult> {
  const iata = iataInput.toUpperCase();
  if (!/^[A-Z]{3}$/.test(iata)) return { status: "airport_not_found" };
  const mode = providerMode();
  if (mode === "none") {
    logger.warn("lounge_provider_not_configured", { iata });
    return { status: "not_configured" };
  }

  if (mode === "file") {
    const airport = findLocalAirport(iata);
    if (!airport) return { status: "airport_not_found" };
    const at = Date.now();
    const lounges = (fileLounges as unknown[])
      .map((r) => normalizeLounge(r, ""))
      .filter((l): l is NormalizedLounge => l !== null && l.airportIata === iata)
      .map((l) => toView(l, "FILE", at));
    return { status: "ok", airport, lounges };
  }

  const hit = cache.get(iata);
  if (hit && Date.now() - hit.at < FRESH_MS) return { status: "ok", airport: hit.airport, lounges: hit.lounges };
  try {
    const { airport: apiAirport, lounges } = await loungeKeyProvider.fetchLounges!(iata);
    const airport = apiAirport ? { ...apiAirport, iata } : findLocalAirport(iata);
    if (!airport) return { status: "airport_not_found" };
    const at = Date.now();
    const views = lounges.map((l) => toView(l, "LOUNGEKEY", at));
    cache.set(iata, { at, airport, lounges: views });
    return { status: "ok", airport, lounges: views };
  } catch (error) {
    logger.error("loungekey_fetch_lounges_failed", { iata, error });
    if (hit && Date.now() - hit.at < STALE_MAX_MS) return { status: "ok", airport: hit.airport, lounges: hit.lounges, stale: true };
    return { status: "error", message: "lounge_fetch_failed" };
  }
}

/** Re-reads the lounge from the authorized source (used by detail pages and order validation). */
export async function getActiveLounge(id: string): Promise<(LoungeView & { airport: AirportInfo }) | null> {
  const parsed = parseLoungeId(id);
  if (!parsed) return null;
  const res = await getLoungesForAirport(parsed.iata);
  if (res.status !== "ok") return null;
  const l = res.lounges.find((x) => x.externalId === parsed.externalId);
  return l ? { ...l, airport: res.airport } : null;
}
