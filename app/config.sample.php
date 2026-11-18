<?php
/**
 * CONFIGURATION — copy this file to config.php (same folder) and fill in the values.
 *
 * Safer option: save it OUTSIDE public_html as /home/YOUR-CPANEL-USER/cheaplounge-config.php
 * (one level above public_html). That file is used first if it exists.
 * The app/ folder is also blocked from the web by app/.htaccess.
 *
 * NEVER commit config.php to GitHub (it is in .gitignore).
 */
return [
    // Public URL of the site, no trailing slash (used for the order link in emails).
    'app_url' => 'https://cheaplounge.com',

    // Long random secret (at least 32 characters). Encrypts order links and creates Order IDs.
    // Generate one at https://www.random.org/passwords/?num=1&len=40&format=html&rnd=new
    // Keep it unchanged after launch, or links in old emails stop working.
    'order_secret' => '',

    // ── Email (SMTP via PHPMailer) ──────────────────────────────────────────
    // cPanel → Email Accounts → (your mailbox) → Connect Devices shows these values.
    'smtp' => [
        'host'     => 'mail.cheaplounge.com',
        'port'     => 465,          // 465 = SSL/TLS, 587 = STARTTLS
        'secure'   => 'ssl',        // 'ssl' for 465, 'tls' for 587
        'username' => 'orders@cheaplounge.com',
        'password' => '',
    ],
    'email_from'      => 'orders@cheaplounge.com',     // must be the SMTP mailbox above
    'email_from_name' => 'JASA TIKET MURAH',
    'email_reply_to'  => 'jasatiketmurah@gmail.com',
    // airportloungevoucher@gmail.com and jasatiketmurah@gmail.com are ALWAYS CC'd (built in).
    'email_extra_cc'  => [],

    // ── Lounge data source ─────────────────────────────────────────────────
    // 'loungekey' → authorized LoungeKey / Collinson partner API (credentials required)
    // 'file'      → lounges listed in app/data/lounges.json, copied from an authorized LoungeKey source
    // anything else → the site shows "lounge data unavailable" (it never invents lounge data)
    'lounge_provider' => 'file',
    'loungekey' => [
        'base_url'      => '',
        'api_key'       => '',
        'token_url'     => '',   // OAuth2 client-credentials token URL, if used
        'client_id'     => '',
        'client_secret' => '',
        'airports_path' => '/airports',
        'lounges_path'  => '/lounges',
        'timeout'       => 10,
    ],
];
