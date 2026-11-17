# JASA TIKET MURAH — Airport Lounge Voucher

A bilingual (Bahasa Indonesia default / English) airport lounge voucher ordering platform: airport search,
lounge listings from an authorized LoungeKey source, multi-step booking, server-side pricing, QRIS
payment with manual verification, transactional emails with CC, and a secure admin dashboard.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · PostgreSQL · Prisma 6 ·
Zod · Resend (email) · Vercel (hosting + cron).

> ⚠️ **Before launch you need:** LoungeKey/Collinson partner API credentials (or use the manual lounge
> source), a Resend API key with a verified sending domain, a PostgreSQL database, and a first admin user.
> See [Remaining external requirements](#remaining-external-requirements).

---

## Features

| Area | What it does |
|---|---|
| Languages | ID (default) + EN, switcher in header, choice persisted in a cookie for 1 year; emails use the customer's language |
| Airport search | Autocomplete by airport name, city, country or IATA code (keyboard accessible) |
| Lounges | Cards + detail page: name, airport, terminal, location, hours, facilities, description, images, conditions, access info — "Information unavailable" when the source lacks a field |
| Booking | 5-step wizard with progress bar: Lounge → Date (today…+90 days, customer local date) → Contact (WhatsApp +62 default, email) → Passengers (dynamic adult/child name fields) → Review + T&C |
| Pricing | Adult IDR 200,000 · Child (<12) IDR 175,000 · recalculated on the server, DB check constraint |
| Single entry | Notice on homepage, pricing, booking form, payment page and every email |
| Payment | Original QRIS image (unmodified), copyable amount, instructions, proof upload; statuses Pending Payment → Payment Submitted → Payment Verified → Processing → Completed / Cancelled |
| Email | Order confirmation, payment verified, payment rejected, order completed — real CC to both internal addresses, delivery status stored, automatic retry, no duplicates |
| WhatsApp | Floating button on every public page (hides while the QR code is on screen), prefilled message per language |
| Admin | Login (scrypt + DB sessions), order list with search/filters/pagination, detail page, proof review, verify/reject, status changes, email status + resend, activity log, CSV export |
| Security | Server validation & sanitisation, DB-backed rate limiting, idempotent orders, duplicate-proof protection, httpOnly SameSite=strict admin cookie, secrets only in env, security headers, CSV formula-injection guard |

## Project structure

```
prisma/
  schema.prisma                # data model
  migrations/                  # SQL migrations (prisma migrate deploy)
  airports-data.ts, seed.ts    # airport reference data (no lounge data)
public/qris/                   # original QRIS image (byte-identical to the supplied file)
scripts/create-admin.ts        # create/reset an admin user
scripts/backup-db.sh           # pg_dump backup with retention
src/app/(site)/                # public pages: home, airports/[iata], lounges/[id], book, order/[orderCode], terms, privacy, track
src/app/admin/                 # login, dashboard, order detail, lounges (manual source), server actions
src/app/api/                   # route handlers (see docs/API.md)
src/components/                # UI components (booking wizard, search, cards, payment)
src/lib/                       # business rules, pricing, dates, validation, i18n, lounges providers, email, auth, orders
tests/                         # unit tests (node --test)
docs/API.md                    # API + LoungeKey integration documentation
```

## Database

Entities: `Airport`, `Lounge`, `Customer`, `Order`, `Passenger`, `Payment`, `EmailNotification`,
`OrderEvent` (audit log), `AdminUser`, `AdminSession`, `RateLimit`.

* Order ID format `CLV-YYYYMMDD-XXXXX` (date in Asia/Jakarta, unambiguous characters), unique index + retry.
* Orders snapshot airport/lounge details and all price components; DB check constraints enforce
  `≥ 1 passenger` and `total = adult subtotal + child subtotal`.
* Payment proofs are stored in PostgreSQL (`bytea`, ≤ 5 MB) so the app works on serverless hosting.
* `EmailNotification` is unique per (order, type) → no duplicate confirmation emails.

## Local installation

Requirements: Node.js ≥ 20.9, PostgreSQL ≥ 14.

```bash
git clone https://github.com/hi-ilhamakbar/cheap-lounge.git
cd cheap-lounge
cp .env.example .env            # fill in DATABASE_URL, DIRECT_URL, etc.
npm install                     # also runs prisma generate
npm run db:migrate              # applies prisma/migrations
npm run db:seed                 # airport reference data
npm run admin:create -- admin@yourdomain.com "Admin Name" "a-long-strong-password"
npm run dev                     # http://localhost:3000  (admin: /admin)
npm test                        # unit tests
```

## Deployment (Vercel)

1. Create a PostgreSQL database (Neon, Supabase, Railway, RDS…). Enable point-in-time recovery.
2. Import the GitHub repo in Vercel (framework preset: Next.js).
3. Add all variables from `.env.example` in **Project → Settings → Environment Variables**
   (`APP_URL` = your production URL, `CRON_SECRET` = long random string).
4. Run migrations against production once (locally with production `DIRECT_URL`):
   `npx prisma migrate deploy && npm run db:seed && npm run admin:create -- …`
5. Deploy. The build runs `prisma generate && next build`.
6. Cron: `vercel.json` schedules `/api/cron/email-retry` every 15 minutes (Vercel Pro). On the Hobby
   plan crons run at most daily — change the schedule to `0 1 * * *` or call the endpoint from an
   external scheduler with the `Authorization: Bearer $CRON_SECRET` header.
7. Check `https://your-domain/api/health` → `database: ok`, `loungeProvider`, `email`.

Other Node hosts work too: `npm run build && npm start` behind HTTPS.

## Environment variables

See `.env.example` for the full annotated list.

| Variable | Required | Purpose |
|---|---|---|
| `APP_URL` | ✓ | Public base URL used in email links |
| `DATABASE_URL`, `DIRECT_URL` | ✓ | PostgreSQL (pooled / direct) |
| `LOUNGE_PROVIDER` | ✓ | `loungekey` or `database` |
| `LOUNGEKEY_API_BASE_URL`, `LOUNGEKEY_API_KEY` and/or `LOUNGEKEY_TOKEN_URL`, `LOUNGEKEY_CLIENT_ID`, `LOUNGEKEY_CLIENT_SECRET` | for `loungekey` | Partner API credentials |
| `LOUNGEKEY_AIRPORTS_PATH`, `LOUNGEKEY_LOUNGES_PATH`, `LOUNGEKEY_TIMEOUT_MS` | optional | Endpoint tuning |
| `RESEND_API_KEY`, `EMAIL_FROM` | ✓ | Transactional email |
| `EMAIL_REPLY_TO`, `EMAIL_EXTRA_CC` | optional | Reply-to, extra CCs (the two business CCs are hard-coded) |
| `ADMIN_SESSION_HOURS` | optional | Admin session lifetime (default 12) |
| `CRON_SECRET` | ✓ | Protects the email retry endpoint |

## Payment verification workflow

The supplied QRIS is **static**, so the system cannot know a payment arrived. Therefore:
1. Customer pays the exact amount and uploads proof → `Payment Submitted`.
2. Admin checks the QRIS merchant dashboard / bank mutation, then **Verify** (→ `Payment Verified`,
   email sent) or **Reject** with a reason (→ back to `Pending Payment`, email sent).
3. Admin moves the order to `Processing` and `Completed` (completion email sent) after issuing vouchers.

To automate this later, use a payment gateway with dynamic QRIS and webhooks (e.g. Midtrans, Xendit,
DOKU): create a charge per order and mark `Payment Verified` from the signed webhook.

## Backups & operations

* Enable your database provider's automated backups / PITR.
* Additionally run `scripts/backup-db.sh` daily from a trusted machine and copy dumps off-site.
* Logs are structured JSON on stdout/stderr (`order_created`, `email_send_failed`, `loungekey_*`, …);
  connect a Vercel log drain or Sentry for alerting.
* Rate limits are stored in PostgreSQL, so they hold across serverless instances.

## Testing

`npm test` runs unit tests for pricing (incl. the 2 adults + 1 child = IDR 575,000 example), the 90-day
date window and timezones, order IDs, WhatsApp normalisation, status transitions, order validation,
password hashing, email content (all required fields, escaping, CC rules), and the LoungeKey normaliser.

## Remaining external requirements

1. **LoungeKey API access** — commercial agreement + credentials + docs from Collinson. Until then use
   `LOUNGE_PROVIDER=database` with lounges entered from an authorized source, or the site shows
   "lounge data unavailable". See `docs/API.md`.
2. **Resend** account, verified sending domain, `RESEND_API_KEY`. Send a test order and confirm both CC
   inboxes receive it.
3. **PostgreSQL** production database and the first admin user.
4. **Terms & Privacy** pages are drafts — have them reviewed (refund policy especially).
5. **Imagery** — no stock photos are bundled. Add licensed lounge photography if desired; lounge images
   otherwise come from the data source.
6. Optional: dynamic QRIS gateway for automatic payment confirmation.
