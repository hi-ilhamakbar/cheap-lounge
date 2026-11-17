import { test } from "node:test";
import assert from "node:assert/strict";
import { renderOrderEmail, emailSubject, type EmailOrder } from "../src/lib/email/templates.ts";
import { normalizeLounge, normalizeAirport, extractList } from "../src/lib/lounges/normalize.ts";

const order: EmailOrder = {
  orderCode: "CLV-20261118-AB2CD",
  language: "id",
  status: "PENDING_PAYMENT",
  customerName: null,
  email: "budi@example.com",
  whatsapp: "+6281234567890",
  airportName: "Soekarno-Hatta International Airport",
  airportIata: "CGK",
  airportCity: "Jakarta",
  loungeName: "Sample <Lounge> & Co",
  loungeTerminal: "3",
  visitDate: "2026-11-20",
  adultQty: 2,
  childQty: 1,
  adultUnitPrice: 200000,
  childUnitPrice: 175000,
  adultSubtotal: 400000,
  childSubtotal: 175000,
  totalAmount: 575000,
  adultNames: ["Budi Santoso", "Siti Aminah"],
  childNames: ["Rizky Putra"],
  orderUrl: "https://example.com/order/CLV-20261118-AB2CD?t=abc",
};

test("email subject follows the required format", () => {
  assert.equal(emailSubject("ORDER_CONFIRMATION", "CLV-20261118-AB2CD", "id"), "Airport Lounge Voucher Order Confirmation – CLV-20261118-AB2CD");
  assert.equal(emailSubject("ORDER_CONFIRMATION", "CLV-20261118-AB2CD", "en"), "Airport Lounge Voucher Order Confirmation – CLV-20261118-AB2CD");
});

test("confirmation email contains every required field (ID)", () => {
  const { html, text } = renderOrderEmail("ORDER_CONFIRMATION", order);
  for (const needle of [
    "CLV-20261118-AB2CD", "+6281234567890", "budi@example.com", "Soekarno-Hatta International Airport (CGK)",
    "Budi Santoso", "Siti Aminah", "Rizky Putra", "Rp 400.000", "Rp 175.000", "Rp 575.000",
    "Menunggu Pembayaran", "Instruksi pembayaran", "+62 852-1300-9993", "SATU KALI MASUK", "20 November 2026",
  ]) {
    assert.ok(text.includes(needle), `text missing: ${needle}`);
  }
  assert.ok(html.includes("Sample &lt;Lounge&gt; &amp; Co"), "HTML must escape lounge name");
  assert.ok(!html.includes("<Lounge>"));
});

test("English email & follow-up types", () => {
  const { text } = renderOrderEmail("PAYMENT_VERIFIED", { ...order, language: "en", status: "PAYMENT_VERIFIED" });
  assert.ok(text.includes("Payment Verified"));
  assert.ok(text.includes("SINGLE ENTRY"));
  assert.ok(!text.includes("Payment instructions")); // only on confirmation / rejection
  const rej = renderOrderEmail("PAYMENT_REJECTED", { ...order, language: "en", rejectionReason: "Amount mismatch" });
  assert.ok(rej.text.includes("Amount mismatch"));
});

test("lounge normalizer maps only fields that exist", () => {
  const l = normalizeLounge(
    {
      id: 123,
      name: "Example Lounge",
      airport: { iata: "sin" },
      terminal: "T1",
      airside: true,
      openingHours: [{ day: "Mon-Sun", open: "05:00", close: "23:00" }],
      amenities: [{ name: "Wi-Fi" }, "Showers"],
      images: ["https://cdn.example.com/a.jpg", "http://insecure.example.com/b.jpg"],
    },
    "SIN",
  );
  assert.ok(l);
  assert.equal(l.externalId, "123");
  assert.equal(l.airportIata, "SIN");
  assert.equal(l.location, "Airside");
  assert.equal(l.openingHours, "Mon-Sun: 05:00–23:00");
  assert.deepEqual(l.facilities, ["Wi-Fi", "Showers"]);
  assert.deepEqual(l.images, ["https://cdn.example.com/a.jpg"]);
  assert.equal(l.description, null); // not invented
  assert.equal(l.conditions, null);
  assert.equal(normalizeLounge({ name: "no id" }, "SIN"), null);
});

test("airport normalizer and list extraction", () => {
  assert.deepEqual(normalizeAirport({ iataCode: "cgk", name: "Soekarno-Hatta", city: "Jakarta", country: "Indonesia" }), {
    iata: "CGK", name: "Soekarno-Hatta", city: "Jakarta", country: "Indonesia",
  });
  assert.equal(normalizeAirport({ code: "TOOLONG", name: "x" }), null);
  assert.equal(extractList({ data: { items: [1, 2] } }).length, 2);
  assert.equal(extractList({ results: [1] }).length, 1);
  assert.equal(extractList(null).length, 0);
});
