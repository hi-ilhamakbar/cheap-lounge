<?php
declare(strict_types=1);

/**
 * No database: the order lives in the confirmation email, and the customer's order-page link carries
 * the order encrypted with AES-256-GCM. It cannot be read or altered without order_secret, so
 * passenger data is not visible in the URL and amounts cannot be tampered with.
 */
const ORDER_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const ORDER_CODE_RE = '/^(CLV|DTK|DHT)-\d{8}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/';

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
function derive_order_code(string $secret, string $idempotencyKey, ?int $nowTs = null, string $prefix = 'CLV'): string
{
    $h = hash_hmac('sha256', "order-code:$prefix:" . $idempotencyKey, $secret, true);
    $suffix = '';
    for ($i = 0; $i < 5; $i++) $suffix .= ORDER_CODE_ALPHABET[ord($h[$i]) % strlen(ORDER_CODE_ALPHABET)];
    $date = (new DateTimeImmutable('@' . ($nowTs ?? time())))->setTimezone(new DateTimeZone('Asia/Jakarta'))->format('Ymd');
    return "$prefix-$date-$suffix";
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
    if (!is_array($o) || !preg_match(ORDER_CODE_RE, (string) ($o['code'] ?? ''))) return null;
    return upgrade_order($o);
}

/** Orders are stored as v3 ({type, customer, price{lines,total}, data}). Older lounge links (v2) are converted. */
function upgrade_order(array $o): ?array
{
    if (($o['v'] ?? null) === 3) return $o;
    if (($o['v'] ?? null) !== 2) return null;
    $p = $o['price'];
    $lines = [];
    if ($p['adultQty']) $lines[] = ['k' => 'adult', 'qty' => $p['adultQty'], 'unit' => $p['adultUnitPrice'], 'sub' => $p['adultSubtotal']];
    if ($p['childQty']) $lines[] = ['k' => 'child', 'qty' => $p['childQty'], 'unit' => $p['childUnitPrice'], 'sub' => $p['childSubtotal']];
    return [
        'v' => 3, 'type' => 'lounge', 'code' => $o['code'], 'createdAt' => $o['createdAt'] ?? '', 'lang' => $o['lang'],
        'customer' => $o['customer'], 'price' => ['lines' => $lines, 'total' => $p['totalAmount']],
        'data' => ['airport' => $o['airport'], 'visitDate' => $o['visitDate'], 'adultNames' => $o['adultNames'], 'childNames' => $o['childNames']],
    ];
}
