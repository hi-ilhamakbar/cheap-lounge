import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePrice, formatIDR } from "../src/lib/pricing.ts";
import { addDaysISO, bookingWindow, isWithinBookingWindow, isValidISODate, localTodayFromOffset, compactDateInTz } from "../src/lib/dates.ts";
import { generateOrderCode, ORDER_CODE_RE, generateAccessToken } from "../src/lib/order-code.ts";
import { normalizeWhatsApp } from "../src/lib/phone.ts";
import { canTransition, allowedNextStatuses } from "../src/lib/order-status.ts";
import { createOrderSchema, issuesToFieldErrors, sanitizeText } from "../src/lib/validation.ts";

test("pricing: spec example 2 adults + 1 child = 575,000", () => {
  const p = calculatePrice(2, 1);
  assert.equal(p.adultSubtotal, 400_000);
  assert.equal(p.childSubtotal, 175_000);
  assert.equal(p.totalAmount, 575_000);
});

test("pricing: adults only, children only, maximum", () => {
  assert.equal(calculatePrice(1, 0).totalAmount, 200_000);
  assert.equal(calculatePrice(0, 1).totalAmount, 175_000);
  assert.equal(calculatePrice(10, 10).totalAmount, 3_750_000);
});

test("pricing: rejects zero passengers, negatives, fractions, too many", () => {
  assert.throws(() => calculatePrice(0, 0));
  assert.throws(() => calculatePrice(-1, 2));
  assert.throws(() => calculatePrice(1.5, 0));
  assert.throws(() => calculatePrice(11, 0));
});

test("formatIDR", () => {
  assert.equal(formatIDR(575000, "id"), "Rp 575.000");
  assert.equal(formatIDR(575000, "en"), "IDR 575,000");
});

test("dates: booking window is today..today+90", () => {
  assert.deepEqual(bookingWindow("2026-11-18"), { min: "2026-11-18", max: "2027-02-16" });
  assert.equal(isWithinBookingWindow("2026-11-18", "2026-11-18"), true);
  assert.equal(isWithinBookingWindow("2027-02-16", "2026-11-18"), true);
  assert.equal(isWithinBookingWindow("2027-02-17", "2026-11-18"), false);
  assert.equal(isWithinBookingWindow("2026-11-17", "2026-11-18"), false);
  assert.equal(isWithinBookingWindow("2026-02-30", "2026-01-01"), false);
});

test("dates: leap-year and month arithmetic", () => {
  assert.equal(addDaysISO("2028-02-28", 1), "2028-02-29");
  assert.equal(addDaysISO("2026-12-31", 1), "2027-01-01");
  assert.equal(isValidISODate("2027-02-29"), false);
  assert.equal(isValidISODate("2028-02-29"), true);
});

test("dates: customer local today from browser offset", () => {
  const now = new Date("2026-11-17T18:30:00Z"); // 01:30 on the 18th in Jakarta
  assert.equal(localTodayFromOffset(now, -420), "2026-11-18"); // Jakarta UTC+7
  assert.equal(localTodayFromOffset(now, 300), "2026-11-17"); // New York UTC-5
  assert.equal(compactDateInTz(now, "Asia/Jakarta"), "20261118");
});

test("order code format CLV-YYYYMMDD-XXXXX", () => {
  const code = generateOrderCode(new Date("2026-11-17T18:30:00Z"));
  assert.match(code, ORDER_CODE_RE);
  assert.ok(code.startsWith("CLV-20261118-"));
  const many = new Set(Array.from({ length: 2000 }, () => generateOrderCode()));
  assert.ok(many.size > 1990);
  assert.equal(generateAccessToken().length, 48);
});

test("whatsapp normalisation", () => {
  assert.equal(normalizeWhatsApp("0812-3456-7890"), "+6281234567890");
  assert.equal(normalizeWhatsApp("+62 812 3456 7890"), "+6281234567890");
  assert.equal(normalizeWhatsApp("6281234567890"), "+6281234567890");
  assert.equal(normalizeWhatsApp("81234567890"), "+6281234567890");
  assert.equal(normalizeWhatsApp("+65 9123 4567"), "+6591234567");
  assert.equal(normalizeWhatsApp("0065 9123 4567"), "+6591234567");
  assert.equal(normalizeWhatsApp("+62 21 1234567"), null); // landline
  assert.equal(normalizeWhatsApp("12345"), null);
  assert.equal(normalizeWhatsApp("abc"), null);
});

test("status transitions: no shortcut to paid", () => {
  assert.equal(canTransition("PENDING_PAYMENT", "PAYMENT_VERIFIED"), false);
  assert.equal(canTransition("PAYMENT_SUBMITTED", "PAYMENT_VERIFIED"), false);
  assert.equal(canTransition("PAYMENT_VERIFIED", "COMPLETED"), true);
  assert.deepEqual(allowedNextStatuses("COMPLETED"), []);
});

const validOrder = {
  idempotencyKey: "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b",
  language: "en",
  email: "  Budi@Example.com ",
  whatsapp: "0812 3456 7890",
  airportIata: "cgk",
  loungeId: "clxyz",
  visitDate: "2026-11-20",
  tzOffsetMinutes: -420,
  adultQty: 2,
  childQty: 1,
  adultNames: ["Budi Santoso", "Siti  Aminah"],
  childNames: ["Rizky O'Neil-Putra"],
  acceptTerms: true,
};

test("order validation: accepts & normalises valid input", () => {
  const r = createOrderSchema.safeParse(validOrder);
  assert.ok(r.success, JSON.stringify(!r.success && r.error.issues));
  assert.equal(r.data.email, "budi@example.com");
  assert.equal(r.data.whatsapp, "+6281234567890");
  assert.equal(r.data.airportIata, "CGK");
  assert.equal(r.data.adultNames[1], "Siti Aminah");
});

test("order validation: names must match quantities; terms required", () => {
  const r = createOrderSchema.safeParse({ ...validOrder, adultQty: 3, acceptTerms: false });
  assert.equal(r.success, false);
  const errs = issuesToFieldErrors(r.error!);
  assert.equal(errs["adultNames"], "errors.nameRequired");
  assert.equal(errs["acceptTerms"], "errors.termsRequired");
});

test("order validation: rejects bad email/phone/name/zero passengers", () => {
  const r = createOrderSchema.safeParse({
    ...validOrder,
    email: "not-an-email",
    whatsapp: "123",
    adultQty: 0,
    childQty: 0,
    adultNames: [],
    childNames: [],
  });
  assert.equal(r.success, false);
  const errs = issuesToFieldErrors(r.error!);
  assert.equal(errs["email"], "errors.emailInvalid");
  assert.equal(errs["whatsapp"], "errors.whatsappInvalid");
  assert.equal(errs["adultQty"], "errors.passengerRequired");
  const bad = createOrderSchema.safeParse({ ...validOrder, adultNames: ["<script>", "X"] });
  assert.equal(bad.success, false);
});

test("sanitizeText", () => {
  assert.equal(sanitizeText("  a\u0000b <c>  d "), "a b c d");
});
