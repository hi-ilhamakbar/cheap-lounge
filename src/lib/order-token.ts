import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { compactDateInTz } from "./dates.ts";
import { BUSINESS_TIMEZONE } from "./business.ts";
import type { PriceBreakdown } from "./pricing.ts";

/**
 * No database: the order lives in the confirmation email, and the customer's order page link carries
 * the order encrypted (AES-256-GCM). The link cannot be read or altered without ORDER_SECRET, so
 * passenger data is not exposed in the URL and amounts cannot be tampered with.
 * SERVER-ONLY (uses node:crypto) — never import from client components.
 */

export type OrderRecord = {
  v: 1;
  code: string;
  createdAt: string;
  lang: "id" | "en";
  customer: { name: string | null; email: string; whatsapp: string };
  airport: { iata: string; name: string; city: string; country: string };
  lounge: { id: string; name: string; terminal: string | null; source: "LOUNGEKEY" | "FILE"; externalId: string };
  visitDate: string;
  adultNames: string[];
  childNames: string[];
  price: PriceBreakdown;
};

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ORDER_CODE_RE = /^CLV-\d{8}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;

export function orderSecret(): string {
  const s = process.env.ORDER_SECRET ?? "";
  if (s.length < 32) throw new Error("ORDER_SECRET must be set (at least 32 characters)");
  return s;
}

/**
 * CLV-YYYYMMDD-XXXXX. The suffix is derived from the browser's idempotency key, so a retried or
 * double-clicked submission produces the SAME order ID (and the email provider de-duplicates it).
 */
export function deriveOrderCode(secret: string, idempotencyKey: string, now: Date = new Date()): string {
  const h = createHmac("sha256", secret).update(`order-code:${idempotencyKey}`).digest();
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += ALPHABET[h[i] % ALPHABET.length];
  return `CLV-${compactDateInTz(now, BUSINESS_TIMEZONE)}-${suffix}`;
}

function key(secret: string) {
  return createHash("sha256").update(`order-link:${secret}`).digest();
}

export function sealOrder(order: OrderRecord, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const body = Buffer.concat([cipher.update(deflateRawSync(Buffer.from(JSON.stringify(order)))), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function openOrder(token: string, secret: string): OrderRecord | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(secret), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = inflateRawSync(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()])).toString("utf8");
    const o = JSON.parse(json) as OrderRecord;
    return o && o.v === 1 && ORDER_CODE_RE.test(o.code) ? o : null;
  } catch {
    return null;
  }
}
