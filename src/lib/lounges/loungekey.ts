import "server-only";
import { ProviderError, type AirportInfo, type LoungeProvider, type NormalizedLounge } from "./types";
import { normalizeAirport, normalizeLounge, extractList } from "./normalize";
import { logger } from "../logger";

/**
 * LoungeKey / Collinson partner API adapter.
 *
 * STATUS: NOT VERIFIED AGAINST A LIVE API. Collinson does not publish public LoungeKey API docs;
 * access (LoungeKey Pass API / Storefront / Agent Web Portal) is granted to commercial partners.
 * This adapter is written against configurable endpoints and a tolerant normalizer. Once the
 * official documentation and credentials are received, confirm:
 *   1. auth scheme (API key header vs OAuth2 client credentials) → env LOUNGEKEY_*,
 *   2. endpoint paths & query params → LOUNGEKEY_AIRPORTS_PATH / LOUNGEKEY_LOUNGES_PATH,
 *   3. field mapping → src/lib/lounges/normalize.ts.
 * It never scrapes loungefinder.loungekey.com and never fabricates responses.
 */

type TokenCache = { token: string; expiresAt: number } | null;
let tokenCache: TokenCache = null;

function cfg() {
  return {
    baseUrl: (process.env.LOUNGEKEY_API_BASE_URL ?? "").replace(/\/+$/, ""),
    apiKey: process.env.LOUNGEKEY_API_KEY ?? "",
    clientId: process.env.LOUNGEKEY_CLIENT_ID ?? "",
    clientSecret: process.env.LOUNGEKEY_CLIENT_SECRET ?? "",
    tokenUrl: process.env.LOUNGEKEY_TOKEN_URL ?? "",
    airportsPath: process.env.LOUNGEKEY_AIRPORTS_PATH || "/airports",
    loungesPath: process.env.LOUNGEKEY_LOUNGES_PATH || "/lounges",
    timeoutMs: Number(process.env.LOUNGEKEY_TIMEOUT_MS) || 10_000,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } catch (e) {
    throw new ProviderError(e instanceof Error && e.name === "AbortError" ? "LoungeKey API timeout" : "LoungeKey API unreachable");
  } finally {
    clearTimeout(timer);
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const c = cfg();
  const h: Record<string, string> = { Accept: "application/json" };
  if (c.apiKey) h["x-api-key"] = c.apiKey;
  if (c.tokenUrl && c.clientId && c.clientSecret) {
    if (!tokenCache || tokenCache.expiresAt < Date.now() + 30_000) {
      const res = await fetchWithTimeout(
        c.tokenUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ grant_type: "client_credentials", client_id: c.clientId, client_secret: c.clientSecret }),
        },
        c.timeoutMs,
      );
      if (!res.ok) throw new ProviderError(`LoungeKey token request failed (${res.status})`, res.status);
      const body = (await res.json()) as { access_token?: string; expires_in?: number };
      if (!body.access_token) throw new ProviderError("LoungeKey token response missing access_token");
      tokenCache = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
    }
    h.Authorization = `Bearer ${tokenCache.token}`;
  }
  return h;
}

async function getJson(path: string, params: Record<string, string>): Promise<unknown> {
  const c = cfg();
  const url = new URL(c.baseUrl + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetchWithTimeout(url.toString(), { headers: await authHeaders() }, c.timeoutMs);
  if (!res.ok) {
    logger.warn("loungekey_http_error", { path, status: res.status });
    throw new ProviderError(`LoungeKey API error (${res.status})`, res.status);
  }
  try {
    return await res.json();
  } catch {
    throw new ProviderError("LoungeKey API returned invalid JSON");
  }
}

export const loungeKeyProvider: LoungeProvider = {
  name: "loungekey",

  isConfigured() {
    const c = cfg();
    return Boolean(c.baseUrl && (c.apiKey || (c.tokenUrl && c.clientId && c.clientSecret)));
  },

  async searchAirports(query: string): Promise<AirportInfo[]> {
    const data = await getJson(cfg().airportsPath, { q: query });
    return extractList(data)
      .map(normalizeAirport)
      .filter((a): a is AirportInfo => a !== null);
  },

  async fetchLounges(iata: string) {
    const data = await getJson(cfg().loungesPath, { airport: iata, iata });
    const lounges = extractList(data)
      .map((item) => normalizeLounge(item, iata))
      .filter((l): l is NormalizedLounge => l !== null && l.airportIata === iata);
    const airportRaw = (data as Record<string, unknown> | null)?.airport;
    const airport = airportRaw ? normalizeAirport(airportRaw) ?? undefined : undefined;
    return { airport, lounges };
  },
};
