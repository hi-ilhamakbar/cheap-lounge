# API & integration notes

All endpoints are plain PHP files in `api/`. Errors: `{"ok":false,"error":"errors.<key>","fields":{…}}`
(keys are translated in `app/lang/*.php`).

| Method | Path | Rate limit | Purpose |
|---|---|---|---|
| GET | `/api/airports.php?q=` | 60/min/IP | Airport autocomplete (name, city, country, IATA) |
| GET | `/api/lounges.php?iata=SIN` | 60/min/IP | Lounges from the authorized source (`503` = not configured) |
| POST | `/api/order.php` (JSON) | 10/10 min/IP | Validate, price, email the order → `{orderCode, token}` |
| POST | `/api/proof.php` (multipart: `code`, `d`, `file`, `payerName?`, `note?`) | 8/10 min/IP | Email proof as attachment |
| GET | `/api/health.php` | — | Configuration check (no secrets) |

`POST /api/order.php` body:
```json
{"idempotencyKey":"uuid","language":"id","customerName":"optional","email":"budi@example.com",
 "whatsapp":"0812 3456 7890","airportIata":"CGK","loungeId":"<id from lounges.php>","visitDate":"2026-11-20",
 "tzOffsetMinutes":-420,"adultQty":2,"childQty":1,"adultNames":["Budi Santoso","Siti Aminah"],
 "childNames":["Rizky Putra"],"acceptTerms":true}
```
Rules: WhatsApp → E.164 (+62 default); visit date within today…+90 days in the customer's local date;
lounge re-read from the source; price recalculated (adult 200,000 / child 175,000); Order ID derived from
`idempotencyKey` (HMAC) so retries return the same order without a second email.

## Payment flow (static QRIS)
Static QRIS cannot confirm payments automatically. Customers upload proof → emailed to staff (CC) →
staff verify in the QRIS merchant account and reply by email/WhatsApp. Uploading never marks an order paid.
For automatic confirmation, a dynamic-QRIS gateway with webhooks (Midtrans, Xendit, DOKU) can be added later.

## LoungeKey
* Collinson (owner of LoungeKey) does not publish public API documentation. **LoungeKey Pass** is offered
  to commercial partners via API, Agent Web Portal or Storefront, under an agreement with credentials.
* `loungefinder.loungekey.com` is not a public API and is **not scraped**.
* `app/lib/lounges.php` contains a cURL adapter (API key header `x-api-key` and/or OAuth2 client
  credentials, configurable paths), a tolerant field normaliser, and a file cache (1 h fresh, 24 h stale
  fallback). **Not verified against a live API.**
* Until access is granted, use `lounge_provider = 'file'` with `app/data/lounges.json`.
