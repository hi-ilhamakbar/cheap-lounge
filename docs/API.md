# API & integration notes

All endpoints are plain PHP files in `api/`. Errors: `{"ok":false,"error":"errors.<key>","fields":{…}}`
(keys are translated in `app/lang/*.php`).

| Method | Path | Rate limit | Purpose |
|---|---|---|---|
| POST | `/api/order.php` (JSON, `type`: `lounge` / `ticket` / `hotel`) | 10/10 min/IP | Validate, price, email the order → `{orderCode, token}` |
| POST | `/api/proof.php` (multipart: `code`, `d`, `file`, `payerName?`, `note?`) | 8/10 min/IP | Email proof as attachment |
| GET | `/api/health.php` | — | Configuration check (no secrets) |

`POST /api/order.php` — lounge body (`type: "lounge"`, plus `acceptVoucherTiming: true`):
```json
{"idempotencyKey":"uuid","language":"id","customerName":"optional","email":"budi@example.com",
 "whatsapp":"0812 3456 7890","airport":"Soekarno-Hatta (CGK)","lounge":"optional free text","visitDate":"2026-11-20",
 "tzOffsetMinutes":-420,"adultQty":2,"childQty":1,"adultNames":["Budi Santoso","Siti Aminah"],
 "childNames":["Rizky Putra"],"acceptTerms":true}
```
Dummy ticket (`type: "ticket"`): `tripType` (`oneway`|`roundtrip`|`multicity`), `routes` [{from,to,date}]
(1, 2 or 2–5), `airline?`, `usageDate`, `adults`, `children`, `infants`, `passengers` [{name,dob,passport,passportExpiry}]
in order adults → children → infants.

Dummy hotel (`type: "hotel"`): `rooms`, `adults`, `children`, `infants`, `stays` [{city,hotel?,checkIn,checkOut}] (1–5),
`guests` [{name}] in order adults → children → infants.

All types also send `idempotencyKey`, `language`, `email`, `whatsapp`, `customerName?`, `tzOffsetMinutes`, `acceptTerms`.

Rules: WhatsApp → E.164 (+62 default); visit date within today…+90 days in the customer's local date;
airport (2–120 chars) and lounge (optional, ≤150 chars) are free text; price recalculated (adult 200,000 / child 175,000); Order ID derived from
`idempotencyKey` (HMAC) so retries return the same order without a second email.

## Payment flow (static QRIS)
Static QRIS cannot confirm payments automatically. Customers upload proof → emailed to staff (CC) →
staff verify in the QRIS merchant account and reply by email/WhatsApp. Uploading never marks an order paid.
For automatic confirmation, a dynamic-QRIS gateway with webhooks (Midtrans, Xendit, DOKU) can be added later.

## Lounges
No lounge data source is used: the customer's airport/lounge text is passed on in the order email and
the team confirms availability. (The undocumented LoungeFinder website endpoints are deliberately not
used — they are not a public API.)
