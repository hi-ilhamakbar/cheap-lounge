<?php
// Unit tests for business rules. Run: php dev/tests/run.php   (no dependencies)
declare(strict_types=1);
require dirname(__DIR__, 2) . '/app/bootstrap.php';

$pass = 0; $fail = 0;
function check(string $name, bool $ok): void { global $pass, $fail; $ok ? $pass++ : $fail++; echo ($ok ? "  ok   " : "  FAIL ") . "$name\n"; }

// Pricing
$p = calculate_price(2, 1);
check('2 adults + 1 child = 575,000', $p['adultSubtotal'] === 400000 && $p['childSubtotal'] === 175000 && $p['totalAmount'] === 575000);
check('adult only 200,000', calculate_price(1, 0)['totalAmount'] === 200000);
check('child only 175,000', calculate_price(0, 1)['totalAmount'] === 175000);
foreach ([[0, 0], [-1, 1], [11, 0]] as [$a, $c]) { try { calculate_price($a, $c); check("reject $a/$c", false); } catch (InvalidArgumentException) { check("reject $a/$c", true); } }
check('format id', format_idr(575000, 'id') === 'Rp 575.000');
check('format en', format_idr(575000, 'en') === 'IDR 575,000');

// Dates
check('window max = today+90', booking_window('2026-11-18')['max'] === '2027-02-16');
check('today allowed', is_within_booking_window('2026-11-18', '2026-11-18'));
check('day 90 allowed', is_within_booking_window('2027-02-16', '2026-11-18'));
check('day 91 rejected', !is_within_booking_window('2027-02-17', '2026-11-18'));
check('yesterday rejected', !is_within_booking_window('2026-11-17', '2026-11-18'));
check('invalid date rejected', !is_valid_iso_date('2026-02-30'));
check('leap day', add_days_iso('2028-02-28', 1) === '2028-02-29');
$now = strtotime('2026-11-17T18:30:00Z');
check('Jakarta local today', local_today_from_offset($now, -420) === '2026-11-18');
check('New York local today', local_today_from_offset($now, 300) === '2026-11-17');
check('visit date label id', format_visit_date('2026-11-20', 'id') === 'Jumat, 20 November 2026');
check('visit date label en', format_visit_date('2026-11-20', 'en') === 'Friday, 20 November 2026');

// WhatsApp
foreach (['0812-3456-7890' => '+6281234567890', '+62 812 3456 7890' => '+6281234567890', '6281234567890' => '+6281234567890', '81234567890' => '+6281234567890', '+65 9123 4567' => '+6591234567', '0065 9123 4567' => '+6591234567', '+62 21 1234567' => null, '12345' => null, 'abc' => null] as $in => $want) {
    check("wa '$in'", normalize_whatsapp((string) $in) === $want);
}

// Validation
$valid = ['idempotencyKey' => '0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b', 'language' => 'en', 'email' => ' Budi@Example.com ', 'whatsapp' => '0812 3456 7890', 'airport' => '  Soekarno-Hatta   (CGK) ', 'lounge' => 'Lounge Terminal 3', 'visitDate' => '2026-11-20', 'tzOffsetMinutes' => -420, 'adultQty' => 2, 'childQty' => 1, 'adultNames' => ['Budi Santoso', 'Siti  Aminah'], 'childNames' => ["Rizky O'Neil-Putra"], 'acceptTerms' => true];
[$d, $e] = validate_order_input($valid);
check('valid order accepted', $e === []);
check('normalised email/phone/airport/name', $d['email'] === 'budi@example.com' && $d['whatsapp'] === '+6281234567890' && $d['airport'] === 'Soekarno-Hatta (CGK)' && $d['lounge'] === 'Lounge Terminal 3' && $d['adultNames'][1] === 'Siti Aminah');
[$d2, $e2] = validate_order_input(['lounge' => '   '] + $valid);
check('lounge is optional (null = team chooses)', $e2 === [] && $d2['lounge'] === null);
[, $e3] = validate_order_input(['airport' => 'x', 'lounge' => str_repeat('a', 151)] + $valid);
check('airport required, lounge max 150', ($e3['airport'] ?? '') === 'errors.airportRequired' && ($e3['lounge'] ?? '') === 'errors.loungeTooLong');
[, $e] = validate_order_input(['adultQty' => 3, 'acceptTerms' => false] + $valid);
check('names must match quantity + terms required', ($e['adultNames'] ?? '') === 'errors.nameRequired' && ($e['acceptTerms'] ?? '') === 'errors.termsRequired');
[, $e] = validate_order_input(['email' => 'x', 'whatsapp' => '123', 'adultQty' => 0, 'childQty' => 0, 'adultNames' => [], 'childNames' => []] + $valid);
check('bad email/phone/zero pax', $e['email'] === 'errors.emailInvalid' && $e['whatsapp'] === 'errors.whatsappInvalid' && $e['adultQty'] === 'errors.passengerRequired');
[, $e] = validate_order_input(['adultNames' => ['<script>', 'X']] + $valid);
check('rejects bad names', isset($e['adultNames.0']) && isset($e['adultNames.1']));
check('sanitize', sanitize_text("  a\x00b <c>  d ") === 'a b c d');

// Order code + encrypted link
$secret = 'test-secret-test-secret-test-secret-123';
$code = derive_order_code($secret, 'key-1234567890abcdef', $now);
check('order code format', (bool) preg_match(ORDER_CODE_RE, $code) && str_starts_with($code, 'CLV-20261118-'));
check('same key → same code', $code === derive_order_code($secret, 'key-1234567890abcdef', $now));
$codes = []; for ($i = 0; $i < 2000; $i++) $codes[derive_order_code($secret, "key-$i-abcdefghijklmnop", $now)] = 1;
check('codes are spread out', count($codes) > 1960);
$order = ['v' => 2, 'code' => $code, 'customer' => ['email' => 'budi@example.com'], 'adultNames' => ['Budi Santoso'], 'price' => calculate_price(2, 1)];
$tok = seal_order($order, $secret);
check('token round-trip', open_order($tok, $secret) === $order);
check('token hides personal data', !str_contains((string) base64url_decode($tok), 'Budi'));
$raw = base64url_decode($tok); $raw[20] = chr(ord($raw[20]) ^ 1);
check('tampered token rejected', open_order(base64url_encode($raw), $secret) === null);
check('wrong secret rejected', open_order($tok, 'another-secret-another-secret-12345') === null);
check('garbage rejected', open_order('garbage!', $secret) === null);

// Email
$o = ['code' => 'CLV-20261118-AB2CD', 'lang' => 'id', 'customer' => ['name' => null, 'email' => 'budi@example.com', 'whatsapp' => '+6281234567890'], 'airport' => 'Soekarno-Hatta (CGK)', 'lounge' => 'Sample <Lounge> & Co, Terminal 3', 'visitDate' => '2026-11-20', 'adultNames' => ['Budi Santoso', 'Siti Aminah'], 'childNames' => ['Rizky Putra'], 'price' => calculate_price(2, 1), 'status' => 'PENDING_PAYMENT', 'orderUrl' => 'https://example.com/order.php?code=x&d=y'];
$m = render_order_email('ORDER_CONFIRMATION', $o);
check('subject format', $m['subject'] === 'Airport Lounge Voucher Order Confirmation – CLV-20261118-AB2CD');
$all = true; foreach (['CLV-20261118-AB2CD', '+6281234567890', 'budi@example.com', 'Bandara: Soekarno-Hatta (CGK)', 'Lounge yang diinginkan: Sample <Lounge> & Co, Terminal 3', 'dikonfirmasi oleh tim kami', 'Budi Santoso', 'Rizky Putra', 'Rp 400.000', 'Rp 175.000', 'Rp 575.000', 'Menunggu Pembayaran', 'Instruksi pembayaran', '+62 852-1300-9993', 'SATU KALI MASUK', '20 November 2026'] as $n) $all = $all && str_contains($m['text'], $n);
check('email contains all required fields', $all);
check('email HTML escapes data', str_contains($m['html'], 'Sample &lt;Lounge&gt; &amp; Co') && !str_contains($m['html'], '<Lounge>'));
$m2 = render_order_email('PAYMENT_SUBMITTED', ['lang' => 'en', 'status' => 'PAYMENT_SUBMITTED', 'payment' => ['fileName' => 'p.jpg', 'payerName' => 'Budi', 'note' => null]] + $o);
$m3 = render_order_email('ORDER_CONFIRMATION', ['lang' => 'en', 'lounge' => null] + $o);
check('no lounge → "Chosen by our team"', str_contains($m3['text'], 'Preferred lounge: Chosen by our team'));
check('proof email (en)', str_contains($m2['subject'], 'Payment Proof Received') && str_contains($m2['text'], 'p.jpg (attached)') && !str_contains($m2['text'], 'Payment instructions'));
check('CC always includes both internal addresses', array_slice(cc_recipients(), 0, 2) === INTERNAL_CC_EMAILS);
check('file type sniffing', sniff_mime("\xFF\xD8\xFF\xE0") === 'image/jpeg' && sniff_mime('%PDF-1.7') === 'application/pdf' && sniff_mime('hello') === null);

// Translations: same keys in both languages
$flat = function (array $a, string $p = '') use (&$flat): array { $o = []; foreach ($a as $k => $v) { $o[] = $p . $k; if (is_array($v)) $o = array_merge($o, $flat($v, "$p$k.")); } return $o; };
check('id/en translation keys match', $flat(dict('id')) === $flat(dict('en')));

echo "\n$pass passed, $fail failed\n";
exit($fail ? 1 : 0);
