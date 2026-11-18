export type AirportInfo = { iata: string; name: string; city: string; country: string };

/** A lounge exactly as the authorized source describes it. Missing fields stay null / empty. */
export type NormalizedLounge = {
  externalId: string;
  airportIata: string;
  name: string;
  terminal: string | null;
  location: string | null;
  openingHours: string | null;
  description: string | null;
  facilities: string[];
  images: string[];
  conditions: string | null;
  accessInfo: string | null;
  raw?: unknown;
};

export type LoungeView = Omit<NormalizedLounge, "raw"> & {
  /** Stable public id: "<IATA>-<base64url(externalId)>" (no database needed). */
  id: string;
  source: "LOUNGEKEY" | "FILE";
  fetchedAt: string;
};

export type LoungeListResult =
  | { status: "ok"; airport: AirportInfo; lounges: LoungeView[]; stale?: boolean }
  | { status: "airport_not_found" }
  | { status: "not_configured" }
  | { status: "error"; message: string };

export interface LoungeProvider {
  readonly name: "loungekey";
  isConfigured(): boolean;
  /** Optional: provider-backed airport search. Falls back to local reference data when absent/failing. */
  searchAirports?(query: string): Promise<AirportInfo[]>;
  /** Fetch lounges for an airport from the authorized source. */
  fetchLounges?(iata: string): Promise<{ airport?: AirportInfo; lounges: NormalizedLounge[] }>;
}

export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ProviderError";
  }
}
