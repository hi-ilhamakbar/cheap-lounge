# JASA TIKET MURAH — Airport Lounge, Dummy Ticket & Dummy Hotel

Bilingual (Bahasa Indonesia default / English) ordering website for **id.cheaplounge.com**. Plain **PHP 8.1+** —
upload the files to the domain folder on cPanel. No Node.js, no npm, no Composer, no database, no build step.

**Homepage** → three services:

| Service | Page | Price (server-side) | Order ID |
|---|---|---|---|
| Airport Lounge voucher | `airport-lounge.php` → `book.php` | Adult Rp 200.000 · child (<12) Rp 175.000 | `CLV-YYYYMMDD-XXXXX` |
| Dummy Ticket (flight reservation) | `dummy-ticket.php` | Rp 100.000 per person per route (one way 100k, round trip 200k, multi-city 100k × routes) — same for adult/child/infant | `DTK-…` |
| Dummy Hotel | `dummy-hotel.php` | Rp 100.000 per person per hotel (adults & children); infants free | `DHT-…` |

* **Lounge:** free-text airport; link to loungefinder.loungekey.com for participating lounges/cafés/spas/sleeping pods;
  big notice (booking review, payment page, email) that **vouchers are sent by the departure day at the latest**,
  with a required acknowledgement checkbox; single-entry notice.
* **Dummy ticket:** one way / round trip / multi-city (2–5 routes), dates today…+300 days in order, optional
  preferred airline, usage date (H-1 recommended), adults/children/infants 0–9 (≥1 adult, infants ≤ adults),
  per passenger full name, date of birth, passport number and expiry.
* **Dummy hotel:** rooms/adults/children/infants 0–9 with room rule (per room 2 adults + 1 infant, or
  1 adult + 1 child + 1 infant), 1–5 hotels/cities with optional preferred hotel, check-in today…+300,
  check-out ≥ 1 night later and ≤ today+300, guest names.
* **Every order is emailed** (PHPMailer over SMTP) to the customer, with a copy to
  `airportloungevoucher@gmail.com` and `jasatiketmurah@gmail.com` — as CC or hidden BCC
  (`'internal_copy' => 'bcc'`). The email *is* the order record. Same QRIS payment page and proof upload for all.
* Floating WhatsApp button (+62 852-1300-9993) on every page.

👉 **Installation on cPanel: see [docs/DEPLOY-CPANEL.md](docs/DEPLOY-CPANEL.md).**

## Folder layout

```
index.php (services) · airport-lounge.php · book.php · dummy-ticket.php · dummy-hotel.php · order.php
terms.php privacy.php track.php 404.php
api/            order.php · proof.php · health.php
assets/         css/app.css (pre-built) · js/app.js · js/booking.js · js/dummy.js · img/
qris/           qris-jasa-tiket-murah.jpg  (original file, byte-identical)
app/            PRIVATE (blocked by .htaccess): bootstrap, config, lib/, lang/, templates/
storage/        PRIVATE, writable: cache, rate limits, sent-email markers, logs
vendor/         PHPMailer 7.2.0 (LGPL-2.1)
dev/            developer tools only (tests, CSS source) — not needed on the server
docs/           documentation
```

## Requirements

PHP **8.1+** (8.1–8.3) with `openssl`, `curl`, `mbstring`, `zlib` — all standard on cPanel.
Choose the version in cPanel → **Select PHP Version** / **MultiPHP Manager**.

## Configuration (`app/config.php`)

Copy `app/config.sample.php` → `app/config.php` (or, safer, to `/home/USER/cheaplounge-config.php`
outside `public_html`) and fill in:

| Key | Purpose |
|---|---|
| `app_url` | `https://cheaplounge.com` |
| `order_secret` | Long random string (≥ 32 chars). Encrypts order links; keep it unchanged |
| `smtp.host / port / secure / username / password` | Your mailbox (cPanel → Email Accounts → Connect Devices) |
| `email_from`, `email_from_name`, `email_reply_to` | Sender = the SMTP mailbox |
| `internal_copy` | `'cc'` (customer sees the two internal Gmail addresses) or `'bcc'` (hidden, also removed from the site footer) |
| `email_extra_cc`, `email_extra_bcc` | Optional extra visible / hidden copies |

Check the setup at `https://cheaplounge.com/api/health.php` → `"ok": true`.

## How orders work (no database)

1. Customer submits the booking → server validates everything, recalculates the price, creates an
   Order ID `CLV-YYYYMMDD-XXXXX` and **emails the order** (customer + both CCs).
   If the email cannot be sent, the order is refused and the customer is asked to retry — nothing is lost.
2. The customer is taken to the payment page (QRIS, exact amount, copy button, instructions). The link is
   in the email too. It carries the order **encrypted** (AES-256-GCM) — unreadable and tamper-proof.
3. Customer pays and uploads the proof → **emailed with the file attached** (customer + both CCs).
4. Staff check the QRIS merchant account and reply by email/WhatsApp with confirmation and the voucher.

Duplicates: a double-click, refresh or retry produces the same Order ID and **no second email**
(sent emails are remembered in `storage/sent` for 24 h). The same proof file is also only sent once.

Find orders in Gmail by searching the Order ID or `CLV-`.

## Lounges — no lounge database

Customers write the airport and (optionally) the lounge they want. Leaving the lounge empty means
"our team chooses". The site never shows lounge details or availability; the confirmation email, the
order page and the booking form all say that **our team confirms availability by email/WhatsApp**.
Earlier versions with a LoungeKey connector remain in the git history if API access is granted later.

## Security

* Secrets only in `config.php` (git-ignored; `app/` is web-blocked) or outside `public_html`
* Server-side validation & sanitisation, output escaping, magic-byte file checks (JPG/PNG/WEBP/PDF ≤ 5 MB)
* Encrypted, tamper-proof order links; rate limiting (file-based); security headers; HTTPS redirect
* `Options -Indexes` — folders are never listed

## Development

* Tests: `php dev/tests/run.php` (71 checks: pricing for all services, dates, phone, validation incl. room
  rules and route order, Order IDs, encryption, email content, translations).
* CSS: classes are Tailwind; `assets/css/app.css` is pre-built and committed. To rebuild after changing
  classes: `cd dev && npm i tailwindcss@4 && node build-css.mjs` (developer machine only).
* Text: `app/lang/id.php` and `app/lang/en.php` (keep the same keys).
