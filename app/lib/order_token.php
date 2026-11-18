<?php
declare(strict_types=1);

/**
 * No database: the order lives in the confirmation email, and the customer's order-page link carries
 * the order encrypted with AES-256-GCM. It cannot be read or altered without order_secret, so
 * passenger data is not visible in the URL and amounts cannot be tampered with.
 */
const ORDER_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const ORDER_CODE_RE = '/^CLV-\d{8}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/';

function order_secret(): string
{
    $s = (string) cfg('order_secret', '');
    if (strlen($s) < 32) throw new RuntimeException('order_secret must be set in config (at least 32 characters)');
    return $s;
}

/**
 * CLV-YYYYMMDD-XXXXX. The suffix is derived from the browser's idempotency key, so a retried or
 * double-clicked submission gets the SAME Order ID (and no second email is sent).
 */
function derive_order_code(string $secret, string $idempotencyKey, ?int $nowTs = null): string
{
    $h = hash_hmac('sha256', 'order-code:' . $idempotencyKey, $secret, true);
    $suffix = '';
    for ($i = 0; $i < 5; $i++) $suffix .= ORDER_CODE_ALPHABET[ord($h[$i]) % strlen(ORDER_CODE_ALPHABET)];
    $date = (new DateTimeImmutable('@' . ($nowTs ?? time())))->setTimezone(new DateTimeZone('Asia/Jakarta'))->format('Ymd');
    return "CLV-$date-$suffix";
}

function order_key(string $secret): string
{
    return hash('sha256', 'order-link:' . $secret, true);
}

function seal_order(array $order, string $secret): string
{
    $iv = random_bytes(12);
    $tag = '';
    $plain = gzdeflate(json_encode($order, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 9);
    $cipher = openssl_encrypt($plain, 'aes-256-gcm', order_key($secret), OPENSSL_RAW_DATA, $iv, $tag);
    if ($cipher === false) throw new RuntimeException('Encryption failed');
    return base64url_encode($iv . $tag . $cipher);
}

function open_order(string $token, string $secret): ?array
{
    $raw = base64url_decode($token);
    if ($raw === false || strlen($raw) < 29) return null;
    $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', order_key($secret), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
    if ($plain === false) return null;
    $json = @gzinflate($plain);
    $o = $json === false ? null : json_decode($json, true);
    return is_array($o) && ($o['v'] ?? null) === 2 && preg_match(ORDER_CODE_RE, (string) ($o['code'] ?? '')) ? $o : null;
}
