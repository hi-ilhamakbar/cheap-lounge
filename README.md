# JASA TIKET MURAH — Airport Lounge Voucher

A bilingual (Bahasa Indonesia default / English) airport lounge voucher ordering website: airport search,
lounge listings from an authorized LoungeKey source, multi-step booking, server-side pricing, QRIS
payment, and automatic order emails.

**No database.** Each order is emailed to the customer with CC to `airportloungevoucher@gmail.com` and
`jasatiketmurah@gmail.com` — those emails are the order records. Payment proofs are emailed as
attachments. Staff verify payments and send vouchers by email / WhatsApp.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Zod · Resend (email) · Vercel.

## Features

| Area | What it does |
|---|---|
| Languages | ID (default) + EN, switcher in the header, remembered in a cookie; emails use the customer's language |
| Airport search | Autocomplete by airport name, city, country or IATA code |
| Lounges | Cards + detail page from the authorized source; "Information unavailable" for missing fields |
| Booking | 5-step wizard with progress bar: Lounge → Date (today…+90 days) → Contact (WhatsApp +62 default, email) → Passengers (dynamic adult/child names) → Review + T&C |
| Pricing | Adult IDR 200,000 · Child (<12) IDR 175,000 — recalculated on the server |
| Single entry | Notice on homepage, pricing, booking form, payment page and every email |
| Order email | "Airport Lounge Voucher Order Confirmation – CLV-YYYYMMDD-XXXXX" with all order details + payment instructions; real CC; no duplicates on refresh/retry |
| Payment | Original QRIS image (unmodified), copyable amount, instructions, proof upload → emailed with attachment |
| WhatsApp | Floating button on every page (hidden while the QR code is on screen) |
| Security | Server validation/sanitisation, encrypted tamper-proof order links, rate limiting, secrets only in env, security headers |

## Project structure

```
public/qris/                 # original QRIS image (byte-identical to the supplied file)
src/app/(site)/              # pages: home, airports/[iata], lounges/[id], book, order/[orderCode], terms, privacy, track
src/app/api/                 # route handlers (see docs/API.md)
src/components/              # UI (booking wizard, search, cards, payment)
src/data/airports.ts         # airport reference data (no lounge data)
src/data/lounges.json        # only for LOUNGE_PROVIDER=file
src/lib/                     # business rules, pricing, dates, validation, i18n, lounge providers, email, order links
tests/                       # unit tests (node --test)
docs/API.md                  # API + LoungeKey integration documentation
```

## Install & run locally

Requirements: Node.js ≥ 20.9.

```bash
git clone https://github.com/hi-ilhamakbar/cheap-lounge.git
cd cheap-lounge
cp .env.example .env.local      # fill in ORDER_SECRET, RESEND_API_KEY, EMAIL_FROM, lounge source
npm install
npm run dev                     # http://localhost:3000
npm test
```

## Deploy (Vercel)

1. Import the GitHub repository in Vercel (framework: Next.js).
2. Add the variables from `.env.example` (Project → Settings → Environment Variables).
   `APP_URL` = your production URL; `ORDER_SECRET` = long random string (keep it stable).
3. Deploy, then open `/api/health` — it should show `ok: true`.
4. Place a test order and check that the customer address and **both** CC inboxes receive it, then upload
   a test proof and check the attachment arrives.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `APP_URL` | ✓ | Base URL used for the order link in emails |
| `ORDER_SECRET` | ✓ | Encrypts order links, derives Order IDs (≥ 32 chars) |
| `RESEND_API_KEY`, `EMAIL_FROM` | ✓ | Sending email (domain verified in Resend) |
| `EMAIL_REPLY_TO`, `EMAIL_EXTRA_CC` | optional | Reply-to, extra CCs (the two business CCs are hard-coded) |
| `LOUNGE_PROVIDER` | ✓ | `loungekey` or `file` |
| `LOUNGEKEY_*` | for `loungekey` | Partner API URL + credentials + paths |

## What changed by removing the database

* No admin dashboard, order search, CSV export or stored statuses — the CC inboxes are the order log
  (search them by Order ID; Gmail labels/filters on "CLV-" work well).
* Payment verification, "processing" and "completed" are done by staff replying by email / WhatsApp.
* If the confirmation email cannot be sent, the order is refused and the customer is asked to retry
  (otherwise it would be lost).
* Rate limiting is per server instance.

## Remaining external requirements

1. **LoungeKey API access** from Collinson (agreement, credentials, docs) — or use `LOUNGE_PROVIDER=file`
   with lounges copied from an authorized source. Until one is configured the site shows
   "lounge data unavailable". See `docs/API.md`.
2. **Resend** account with a verified sending domain.
3. **Terms & Privacy** pages are drafts — have them reviewed (refund policy especially).
4. Optional: licensed lounge photography; a dynamic QRIS gateway for automatic payment confirmation.
