import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveOrderCode, sealOrder, openOrder, ORDER_CODE_RE, type OrderRecord } from "../src/lib/order-token.ts";
import { calculatePrice } from "../src/lib/pricing.ts";

const SECRET = "test-secret-test-secret-test-secret-123";

const order: OrderRecord = {
  v: 1,
  code: deriveOrderCode(SECRET, "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b", new Date("2026-11-17T18:30:00Z")),
  createdAt: "2026-11-17T18:30:00.000Z",
  lang: "id",
  customer: { name: null, email: "budi@example.com", whatsapp: "+6281234567890" },
  airport: { iata: "CGK", name: "Soekarno-Hatta International Airport", city: "Jakarta", country: "Indonesia" },
  lounge: { id: "CGK-eDE", name: "Lounge", terminal: "3", source: "LOUNGEKEY", externalId: "x1" },
  visitDate: "2026-11-20",
  adultNames: ["Budi Santoso", "Siti Aminah"],
  childNames: ["Rizky Putra"],
  price: calculatePrice(2, 1),
};

test("order code: CLV-YYYYMMDD-XXXXX, same key → same code, different key → different code", () => {
  assert.match(order.code, ORDER_CODE_RE);
  assert.ok(order.code.startsWith("CLV-20261118-"));
  const now = new Date("2026-11-17T18:30:00Z");
  assert.equal(deriveOrderCode(SECRET, "key-a-1234567890abcd", now), deriveOrderCode(SECRET, "key-a-1234567890abcd", now));
  const codes = new Set(Array.from({ length: 2000 }, (_, i) => deriveOrderCode(SECRET, `key-${i}-abcdefghijklmnop`, now)));
  assert.ok(codes.size > 1960);
});

test("sealed order link round-trips and hides personal data", () => {
  const token = sealOrder(order, SECRET);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.ok(!token.includes("budi") && !Buffer.from(token, "base64url").toString("latin1").includes("Budi"));
  assert.ok(token.length < 900, `token length ${token.length}`);
  const back = openOrder(token, SECRET);
  assert.deepEqual(back, order);
  assert.equal(back!.price.totalAmount, 575_000);
});

test("tampered or foreign tokens are rejected", () => {
  const token = sealOrder(order, SECRET);
  const raw = Buffer.from(token, "base64url");
  raw[raw.length - 1] ^= 1;
  assert.equal(openOrder(raw.toString("base64url"), SECRET), null);
  assert.equal(openOrder(token, "another-secret-another-secret-12345"), null);
  assert.equal(openOrder("garbage", SECRET), null);
  assert.equal(openOrder("", SECRET), null);
});
