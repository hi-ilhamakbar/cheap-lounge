import "server-only";
import type { Lounge, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { logger } from "../logger";
import { loungeKeyProvider } from "./loungekey";
import type { AirportInfo, LoungeListResult, LoungeView } from "./types";

/** Fresh cache window: serve cached LoungeKey data without calling the API again. */
const FRESH_MS = 60 * 60 * 1000;
/** If the API fails, previously synced data younger than this is still shown (marked stale). */
const STALE_MAX_MS = 24 * 60 * 60 * 1000;

export type ProviderMode = "loungekey" | "database" | "none";

export function providerMode(): ProviderMode {
  const p = (process.env.LOUNGE_PROVIDER ?? "").toLowerCase();
  if (p === "loungekey") return loungeKeyProvider.isConfigured() ? "loungekey" : "none";
  if (p === "database") return "database";
  return "none";
}

export function toLoungeView(l: Lounge): LoungeView {
  return {
    id: l.id,
    source: l.source,
    externalId: l.externalId,
    airportIata: l.airportIata,
    name: l.name,
    terminal: l.terminal,
    location: l.location,
    openingHours: l.openingHours,
    description: l.description,
    facilities: l.facilities,
    images: l.images,
    conditions: l.conditions,
    accessInfo: l.accessInfo,
    syncedAt: l.syncedAt.toISOString(),
  };
}

// ── Airports ─────────────────────────────────────────────────────────────

async function searchLocalAirports(q: string): Promise<AirportInfo[]> {
  const query = q.trim();
  const upper = query.toUpperCase();
  const rows = await prisma.airport.findMany({
    where: {
      OR: [
        { iata: { equals: upper } },
        { iata: { startsWith: upper } },
        { name: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { country: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 25,
  });
  // Exact IATA first, then IATA prefix, then city/name prefix, then alphabetical.
  const score = (a: AirportInfo) =>
    a.iata === upper ? 0 : a.iata.startsWith(upper) ? 1 : a.city.toUpperCase().startsWith(upper) || a.name.toUpperCase().startsWith(upper) ? 2 : 3;
  return rows
    .map(({ iata, name, city, country }) => ({ iata, name, city, country }))
    .sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name))
    .slice(0, 8);
}

export async function searchAirports(q: string): Promise<AirportInfo[]> {
  if (providerMode() === "loungekey" && loungeKeyProvider.searchAirports) {
    try {
      const remote = await loungeKeyProvider.searchAirports(q);
      // Keep airport reference table in sync so lounge rows can reference it.
      await Promise.all(
        remote.slice(0, 20).map((a) =>
          prisma.airport.upsert({ where: { iata: a.iata }, update: { name: a.name, city: a.city, country: a.country }, create: a }),
        ),
      );
      if (remote.length) return remote.slice(0, 8);
    } catch (error) {
      logger.warn("loungekey_airport_search_failed_using_reference_data", { error });
    }
  }
  return searchLocalAirports(q);
}

export async function getAirport(iata: string): Promise<AirportInfo | null> {
  const a = await prisma.airport.findUnique({ where: { iata: iata.toUpperCase() } });
  return a ? { iata: a.iata, name: a.name, city: a.city, country: a.country } : null;
}

// ── Lounges ──────────────────────────────────────────────────────────────

export async function getLoungesForAirport(iataInput: string): Promise<LoungeListResult> {
  const iata = iataInput.toUpperCase();
  if (!/^[A-Z]{3}$/.test(iata)) return { status: "airport_not_found" };
  const mode = providerMode();

  if (mode === "none") {
    logger.warn("lounge_provider_not_configured", { iata });
    return { status: "not_configured" };
  }

  let airport = await getAirport(iata);

  if (mode === "database") {
    if (!airport) return { status: "airport_not_found" };
    const rows = await prisma.lounge.findMany({
      where: { airportIata: iata, source: "MANUAL", active: true },
      orderBy: [{ terminal: "asc" }, { name: "asc" }],
    });
    return { status: "ok", airport, lounges: rows.map(toLoungeView) };
  }

  // LoungeKey mode
  const cached = await prisma.lounge.findMany({
    where: { airportIata: iata, source: "LOUNGEKEY", active: true },
    orderBy: [{ terminal: "asc" }, { name: "asc" }],
  });
  const newest = cached.reduce((m, l) => Math.max(m, l.syncedAt.getTime()), 0);
  if (airport && cached.length && Date.now() - newest < FRESH_MS) {
    return { status: "ok", airport, lounges: cached.map(toLoungeView) };
  }

  try {
    const { airport: apiAirport, lounges } = await loungeKeyProvider.fetchLounges!(iata);
    if (apiAirport) {
      await prisma.airport.upsert({
        where: { iata },
        update: { name: apiAirport.name, city: apiAirport.city, country: apiAirport.country },
        create: { ...apiAirport, iata },
      });
      airport = { ...apiAirport, iata };
    }
    if (!airport) return { status: "airport_not_found" };

    const now = new Date();
    const saved = await prisma.$transaction(async (tx) => {
      const out: Lounge[] = [];
      for (const l of lounges) {
        const data = {
          airportIata: iata,
          name: l.name,
          terminal: l.terminal,
          location: l.location,
          openingHours: l.openingHours,
          description: l.description,
          facilities: l.facilities,
          images: l.images,
          conditions: l.conditions,
          accessInfo: l.accessInfo,
          raw: (l.raw ?? undefined) as Prisma.InputJsonValue | undefined,
          active: true,
          syncedAt: now,
        };
        out.push(
          await tx.lounge.upsert({
            where: { source_externalId: { source: "LOUNGEKEY", externalId: l.externalId } },
            update: data,
            create: { ...data, source: "LOUNGEKEY", externalId: l.externalId },
          }),
        );
      }
      // Lounges no longer returned by the API are deactivated (never shown as available).
      await tx.lounge.updateMany({
        where: { airportIata: iata, source: "LOUNGEKEY", externalId: { notIn: lounges.map((l) => l.externalId) } },
        data: { active: false },
      });
      return out;
    });
    return { status: "ok", airport, lounges: saved.map(toLoungeView) };
  } catch (error) {
    logger.error("loungekey_fetch_lounges_failed", { iata, error });
    if (airport && cached.length && Date.now() - newest < STALE_MAX_MS) {
      return { status: "ok", airport, lounges: cached.map(toLoungeView), stale: true };
    }
    return { status: "error", message: "lounge_fetch_failed" };
  }
}

/** Server-side lookup used for lounge detail pages and order validation. */
export async function getActiveLounge(id: string): Promise<(LoungeView & { airport: AirportInfo }) | null> {
  const mode = providerMode();
  if (mode === "none") return null;
  const l = await prisma.lounge.findFirst({
    where: { id, active: true, source: mode === "database" ? "MANUAL" : "LOUNGEKEY" },
    include: { airport: true },
  });
  if (!l) return null;
  const { iata, name, city, country } = l.airport;
  return { ...toLoungeView(l), airport: { iata, name, city, country } };
}
