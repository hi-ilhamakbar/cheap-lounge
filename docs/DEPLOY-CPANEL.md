# Install on cPanel (cheaplounge.com) — no Node.js, no npm

## 0. Clean up
In **File Manager → public_html**, delete the old Next.js files you uploaded earlier
(`src/`, `public/`, `tests/`, `docs/`, `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`,
`postcss.config.mjs`, `LICENSE`). **Do not touch** other sites' folders (e.g. `privatejetexecutive…`).

## 1. PHP version
cPanel → **Select PHP Version** (or MultiPHP Manager) → choose **PHP 8.1, 8.2 or 8.3**.
Make sure the extensions **openssl, curl, mbstring, zlib** are ticked (they usually are).
Under **Options**: `upload_max_filesize` ≥ 6M and `post_max_size` ≥ 8M (for 5 MB payment proofs).

## 2. Upload the files
Download the repository as ZIP (GitHub → Code → Download ZIP). In File Manager open **public_html**,
upload the ZIP, **Extract**, then move everything from the extracted `cheap-lounge-main/` folder up into
`public_html` (select all → Move → `/public_html`). Include the hidden files `.htaccess` and `.user.ini`
(File Manager → Settings → *Show Hidden Files*).

You can skip `dev/` and `docs/` — they are not needed on the server (and are blocked anyway).

Make sure `storage/` and its subfolders are writable (permissions **755**, the default, is fine on cPanel).

## 3. Create the sending mailbox
cPanel → **Email Accounts** → Create → `orders@cheaplounge.com` (strong password).
Click **Connect Devices** to see the SMTP settings — typically:
outgoing server `mail.cheaplounge.com`, port **465**, SSL/TLS.

Also open cPanel → **Email Deliverability** and repair/enable **SPF and DKIM** so the order emails don't
land in spam.

## 4. Configure
In File Manager, open `public_html/app/`, copy `config.sample.php` → `config.php`, **Edit** it:

```php
'app_url' => 'https://cheaplounge.com',
'order_secret' => 'PASTE-A-LONG-RANDOM-STRING-40-CHARS-OR-MORE',
'smtp' => [
    'host' => 'mail.cheaplounge.com',
    'port' => 465,
    'secure' => 'ssl',
    'username' => 'orders@cheaplounge.com',
    'password' => 'THE-MAILBOX-PASSWORD',
],
'email_from' => 'orders@cheaplounge.com',
```

(Safer: put this file at `/home/chee7661/cheaplounge-config.php`, one level above public_html — it is
used automatically if it exists.)

## 5. Check
1. `https://cheaplounge.com/api/health.php` → `"ok": true` (shows which part is missing if not).
2. Open `https://cheaplounge.com` → type an airport/lounge → **Cari Lounge** → place a **test order** with
   your own email. Confirm the customer address **and both Gmail CCs** receive
   "Airport Lounge Voucher Order Confirmation – CLV-…".
3. On the payment page, upload a test image → the "Payment Proof Received" email arrives with the
   attachment.

## Troubleshooting
* **Order fails with "confirmation email could not be sent"** → wrong SMTP settings. Check
  `storage/logs/app.log` (event `order_email_failed`) for the exact SMTP error. Try port 587 with
  `'secure' => 'tls'` if 465 is blocked.
* **500 error** → `storage/logs/php-error.log`; usually PHP version < 8.1 or `config.php` syntax.
* **Upload says file too large** → raise `upload_max_filesize` / `post_max_size` (step 1).
* **Emails in spam** → Email Deliverability: SPF + DKIM.

## Running on a subdomain (e.g. id.cheaplounge.com)
No code changes are needed — all links are relative; only the config changes.
1. cPanel → **Domains** → **Create A New Domain** → `id.cheaplounge.com`. Untick "Share document root"
   and use a folder **outside** public_html, e.g. `/home/USER/id.cheaplounge.com`.
2. Move/upload the site files into that folder (including `.htaccess` and `.user.ini`).
3. In `app/config.php` set `'app_url' => 'https://id.cheaplounge.com'` (used for the order link in emails).
   SMTP stays `mail.cheaplounge.com` with the same mailbox.
4. cPanel → **SSL/TLS Status** → **Run AutoSSL** so the subdomain gets HTTPS (the site forces HTTPS).
5. Optional: redirect the main domain — cPanel → **Redirects** → `cheaplounge.com` → `https://id.cheaplounge.com` (301).
6. Check `https://id.cheaplounge.com/api/health.php`.
A config file outside the web folder is looked for one level above it
(`/home/USER/cheaplounge-config.php` for both layouts).

## Updating to a new version
Download the latest ZIP from GitHub and upload/overwrite the files in the site folder. Your
`app/config.php` is not in the repository, so it is never overwritten. Files that no longer exist in the
repository can be deleted from the server.
