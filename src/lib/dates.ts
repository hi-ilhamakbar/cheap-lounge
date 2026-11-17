import { BOOKING_WINDOW_DAYS } from "./business.ts";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Format a Date's *local* calendar date as YYYY-MM-DD (browser side: customer's local date). */
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Add whole days to a YYYY-MM-DD string (calendar arithmetic in UTC, DST-safe). */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export function isValidISODate(iso: string): boolean {
  if (!DATE_RE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Customer's local "today", computed on the server from the browser's
 * Date#getTimezoneOffset() value (minutes, UTC − local; e.g. Jakarta = -420).
 */
export function localTodayFromOffset(now: Date, tzOffsetMinutes: number): string {
  return new Date(now.getTime() - tzOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

export function isValidTzOffset(n: number): boolean {
  // Real-world offsets span UTC-12 (+720) to UTC+14 (-840).
  return Number.isInteger(n) && n >= -840 && n <= 720;
}

export function bookingWindow(localToday: string): { min: string; max: string } {
  return { min: localToday, max: addDaysISO(localToday, BOOKING_WINDOW_DAYS) };
}

/** True when visitDate is within [today, today + 90 days] of the customer's local date. */
export function isWithinBookingWindow(visitDate: string, localToday: string): boolean {
  if (!isValidISODate(visitDate) || !isValidISODate(localToday)) return false;
  const { min, max } = bookingWindow(localToday);
  return visitDate >= min && visitDate <= max; // lexical compare is safe for YYYY-MM-DD
}

/** YYYYMMDD of `now` in the given IANA timezone. */
export function compactDateInTz(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

/** Human date, e.g. "Rabu, 18 November 2026" / "Wednesday, 18 November 2026". Input YYYY-MM-DD or Date. */
export function formatVisitDate(value: string | Date, lang: "id" | "en"): string {
  const iso = typeof value === "string" ? value : value.toISOString().slice(0, 10);
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
