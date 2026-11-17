import type { AirportInfo, NormalizedLounge } from "./types";

/**
 * Tolerant mapping from partner-API JSON to our lounge shape. Only values actually present in the
 * response are used — absent fields become null/[] and the UI shows "Information unavailable".
 * Adjust the candidate keys once the official LoungeKey field names are confirmed.
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function pick(o: Obj, keys: string[]): unknown {
  for (const k of keys) {
    if (o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k];
  }
  return undefined;
}

function str(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  if (isObj(v)) {
    // e.g. { en: "...", id: "..." } or { text: "..." }
    const inner = pick(v, ["en", "text", "value", "description", "name"]);
    return typeof inner === "string" ? inner.trim() || null : null;
  }
  if (Array.isArray(v)) {
    const parts = v.map(str).filter(Boolean);
    return parts.length ? parts.join("\n") : null;
  }
  return null;
}

function strList(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => (isObj(x) ? str(pick(x, ["name", "label", "title", "code", "url", "src"])) : str(x)))
      .filter((x): x is string => Boolean(x));
  }
  if (typeof v === "string") return v.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function openingHours(v: unknown): string | null {
  if (Array.isArray(v)) {
    const lines = v.map((x) => {
      if (!isObj(x)) return str(x);
      const day = str(pick(x, ["day", "days", "dayOfWeek"]));
      const open = str(pick(x, ["open", "from", "opens", "openTime"]));
      const close = str(pick(x, ["close", "to", "closes", "closeTime"]));
      if (open && close) return `${day ? day + ": " : ""}${open}–${close}`;
      return str(pick(x, ["text", "hours", "description"]));
    });
    const out = lines.filter(Boolean);
    return out.length ? out.join("\n") : null;
  }
  return str(v);
}

/** Unwraps { data: [...] } / { items: [...] } / { results: [...] } / [...] */
export function extractList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (isObj(data)) {
    for (const k of ["data", "items", "results", "lounges", "airports", "outlets"]) {
      const v = data[k];
      if (Array.isArray(v)) return v;
      if (isObj(v)) {
        const nested = extractList(v);
        if (nested.length) return nested;
      }
    }
  }
  return [];
}

export function normalizeAirport(raw: unknown): AirportInfo | null {
  if (!isObj(raw)) return null;
  const iata = str(pick(raw, ["iata", "iataCode", "iata_code", "airportCode", "code"]));
  const name = str(pick(raw, ["name", "airportName", "airport_name"]));
  if (!iata || !/^[A-Za-z]{3}$/.test(iata) || !name) return null;
  return {
    iata: iata.toUpperCase(),
    name,
    city: str(pick(raw, ["city", "cityName", "city_name"])) ?? "",
    country: str(pick(raw, ["country", "countryName", "country_name"])) ?? "",
  };
}

export function normalizeLounge(raw: unknown, fallbackIata: string): NormalizedLounge | null {
  if (!isObj(raw)) return null;
  const externalId = str(pick(raw, ["id", "loungeId", "lounge_id", "outletId", "code", "reference"]));
  const name = str(pick(raw, ["name", "loungeName", "lounge_name", "title"]));
  if (!externalId || !name) return null;

  const airportField = pick(raw, ["airport", "airportCode", "iata", "airport_iata"]);
  const iata =
    (isObj(airportField) ? str(pick(airportField, ["iata", "iataCode", "code"])) : str(airportField))?.toUpperCase() ?? fallbackIata;

  let location = str(pick(raw, ["location", "locationDescription", "directions", "zone"]));
  const airside = pick(raw, ["airside", "isAirside"]);
  if (typeof airside === "boolean") location = [airside ? "Airside" : "Landside", location].filter(Boolean).join(" — ");

  return {
    externalId,
    airportIata: iata,
    name,
    terminal: str(pick(raw, ["terminal", "terminalName", "terminal_name"])),
    location,
    openingHours: openingHours(pick(raw, ["openingHours", "opening_hours", "openingTimes", "hours"])),
    description: str(pick(raw, ["description", "summary", "about"])),
    facilities: strList(pick(raw, ["facilities", "amenities", "services"])),
    images: strList(pick(raw, ["images", "imageUrls", "photos", "media"])).filter((u) => /^https:\/\//.test(u)),
    conditions: str(pick(raw, ["conditions", "restrictions", "accessConditions", "terms", "rules"])),
    accessInfo: str(pick(raw, ["accessInfo", "access", "entryRequirements", "bookingInformation"])),
    raw,
  };
}
