# JASA TIKET MURAH — Airport Lounge Voucher website

Bilingual (Bahasa Indonesia default / English) airport lounge voucher ordering site for
**cheaplounge.com**. Plain **PHP 8** — upload the files to `public_html` on cPanel. No Node.js, no npm,
no Composer, no database, no build step.

* Free-text search: the customer types the airport / lounge they want → **Cari Lounge** opens the booking form
  with it pre-filled. No lounge database: **your team confirms availability** by email/WhatsApp.
* 5-step booking: Airport & Lounge (free text) → Date (today…+90 days) → Contact → Passengers (dynamic adult/child names) → Review
* Fixed prices: adult **Rp 200.000**, child under 12 **Rp 175.000** — recalculated on the server
* "Single entry only" notice on homepage, pricing, booking form, payment page and every email
* Payment by the original **QRIS** image (unmodified) + payment-proof upload
* **Every order is emailed** (PHPMailer over SMTP) to the customer with real **CC** to
  `airportloungevoucher@gmail.com` and `jasatiketmurah@gmail.com` — the email *is* the order record.
  Payment proofs are emailed as attachments.
* Floating WhatsApp button (+62 852-1300-9993) on every page

👉 **Installation on cPanel: see [docs/DEPLOY-CPANEL.md](docs/DEPLOY-CPANEL.md).**

## Folder layout

```
index.php book.php order.php terms.php privacy.php track.php 404.php
api/            order.php · proof.php · health.php
assets/         css/app.css (pre-built) · js/app.js · js/booking.js · img/
qris/           qris-jasa-tiket-murah.jpg  (original file, byte-identical)
app/            PRIVATE (blocked by .htaccess): bootstrap, config, lib/, lang/, templates/
storage/        PRIVATE, writable: cache, rate limits, sent-email markers, logs
vendor/         PHPMailer 7.2.0 (LGPL-2.1)
dev/            developer tools only (tests, CSS source) — not needed on the server
docs/           documentation
```

## Requirements

PHP **8.0+** (8.1–8.3 recommended) with `openssl`, `curl`, `mbstring`, `zlib` — all standard on cPanel.
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
| `email_extra_cc` | Optional extra CCs (the two business CCs are built in) |

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

* Tests: `php dev/tests/run.php` (52 checks: pricing, dates, phone, validation, Order IDs, encryption,
  email content, translations).
* CSS: classes are Tailwind; `assets/css/app.css` is pre-built and committed. To rebuild after changing
  classes: `cd dev && npm i tailwindcss@4 && node build-css.mjs` (developer machine only).
* Text: `app/lang/id.php` and `app/lang/en.php` (keep the same keys).
