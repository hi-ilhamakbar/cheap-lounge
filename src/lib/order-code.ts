import { compactDateInTz } from "./dates.ts";
import { BUSINESS_TIMEZONE } from "./business.ts";

// No 0/O/1/I/L to avoid confusion when read over the phone / WhatsApp.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const ORDER_CODE_RE = /^CLV-\d{8}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;

function randomChars(n: number): string {
  const bytes = new Uint8Array(n);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  // 31 symbols; modulo bias is negligible for an identifier (not a secret).
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** CLV-YYYYMMDD-XXXXX (date in Asia/Jakarta). Uniqueness is enforced by a DB unique index + retry. */
export function generateOrderCode(now: Date = new Date()): string {
  return `CLV-${compactDateInTz(now, BUSINESS_TIMEZONE)}-${randomChars(5)}`;
}

/** Unguessable token that lets the customer open their own order page. */
export function generateAccessToken(): string {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
