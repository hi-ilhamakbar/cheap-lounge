import { AIRPORTS } from "../data/airports.ts";
import type { AirportInfo } from "./lounges/types";

/** Search the bundled airport reference list (public airport facts only — no lounge data). */
export function searchLocalAirports(q: string, limit = 8): AirportInfo[] {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];
  const upper = query.toUpperCase();
  const score = (a: AirportInfo) => {
    if (a.iata === upper) return 0;
    if (a.iata.startsWith(upper)) return 1;
    if (a.city.toLowerCase().startsWith(query) || a.name.toLowerCase().startsWith(query)) return 2;
    if (a.city.toLowerCase().includes(query) || a.name.toLowerCase().includes(query)) return 3;
    if (a.country.toLowerCase().includes(query)) return 4;
    return 9;
  };
  return AIRPORTS.map(({ iata, name, city, country }) => ({ iata, name, city, country }))
    .map((a) => ({ a, s: score(a) }))
    .filter((x) => x.s < 9)
    .sort((x, y) => x.s - y.s || x.a.name.localeCompare(y.a.name))
    .slice(0, limit)
    .map((x) => x.a);
}

export function findLocalAirport(iata: string): AirportInfo | null {
  const a = AIRPORTS.find((x) => x.iata === iata.toUpperCase());
  return a ? { iata: a.iata, name: a.name, city: a.city, country: a.country } : null;
}
