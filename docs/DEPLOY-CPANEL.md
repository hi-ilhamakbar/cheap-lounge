# Deploying on cPanel (cheaplounge.com)

This is a **Node.js (Next.js)** application, not a PHP site. Copying the source files into
`public_html` only makes Apache list them ("Index of /") — nothing runs. It must run as a Node.js app.

> ⚠️ First, **delete the copied source files from `public_html`** (LICENSE, docs/, src/, public/,
> tests/, package.json, *.config.*, tsconfig.json). They are publicly browsable right now.
> Don't touch other sites' folders (e.g. `privatejetexecutive…`).

## Requirement: "Setup Node.js App" in cPanel
Look in cPanel → **Software → Setup Node.js App** (CloudLinux / Passenger). Node.js **20 or newer** is
needed. If your plan doesn't have it, ask the host to enable it, or host on Vercel (free tier) and point
the domain's DNS there (see README).

## 1. Build on your computer
Shared hosting usually doesn't have enough memory to build Next.js, so build locally
(Node.js 20+ from nodejs.org):

```bash
cd cheap-lounge
npm install
npm run build:cpanel
```
This creates a `cpanel-upload/` folder (server.js, .next/, node_modules/, public/). Zip its **contents**.

## 2. Create the Node.js app in cPanel
Setup Node.js App → **Create Application**:
- Node.js version: **20.x** (or newer)
- Application mode: **Production**
- Application root: `cheaplounge` (a folder **outside** public_html, e.g. `/home/USER/cheaplounge`)
- Application URL: `cheaplounge.com`
- Application startup file: `server.js`

Click **Create**.

## 3. Upload
File Manager → open `/home/USER/cheaplounge` → Upload the zip → **Extract** there.
You should see `server.js`, `.next/`, `node_modules/`, `public/` directly inside that folder.
(Do not run "Run NPM Install" — dependencies are already bundled.)

## 4. Environment variables (secrets go HERE, not in files)
In Setup Node.js App → your app → **Environment variables → Add variable**:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `APP_URL` | `https://cheaplounge.com` |
| `ORDER_SECRET` | long random string (≥ 32 chars) — keep it unchanged |
| `EMAIL_PROVIDER` | `smtp` |
| `EMAIL_FROM` | `JASA TIKET MURAH <orders@cheaplounge.com>` |
| `EMAIL_REPLY_TO` | `jasatiketmurah@gmail.com` |
| `SMTP_HOST` | `mail.cheaplounge.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `orders@cheaplounge.com` |
| `SMTP_PASS` | that mailbox's password |
| `LOUNGE_PROVIDER` | `loungekey` (with `LOUNGEKEY_*`) or `file` |

SMTP values: cPanel → **Email Accounts** → create `orders@cheaplounge.com` → **Connect Devices** shows
the outgoing server and port. `EMAIL_FROM` must be that same mailbox. The two CC addresses
(airportloungevoucher@gmail.com, jasatiketmurah@gmail.com) are built in.

Save, then click **Restart**.

## 5. Check
- `https://cheaplounge.com` shows the site.
- `https://cheaplounge.com/api/health` → `"ok": true`, `"email": "smtp"`.
- Place a test order: the customer address **and both Gmail CCs** must receive it. Upload a test proof
  and check the attachment. If mail lands in spam, add SPF/DKIM in cPanel → **Email Deliverability**.

## Updating the site
Build again locally (`npm run build:cpanel`), upload/extract over the app folder, click **Restart**.
