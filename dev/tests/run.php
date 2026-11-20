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

// Validation — common + lounge
$valid = ['type' => 'lounge', 'idempotencyKey' => '0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b', 'language' => 'en', 'email' => ' Budi@Example.com ', 'whatsapp' => '0812 3456 7890', 'airport' => '  Soekarno-Hatta   (CGK) ', 'visitDate' => '2026-11-20', 'tzOffsetMinutes' => -420, 'adultQty' => 2, 'childQty' => 1, 'adultNames' => ['Budi Santoso', 'Siti  Aminah'], 'childNames' => ["Rizky O'Neil-Putra"], 'acceptTerms' => true, 'acceptVoucherTiming' => true];
[$d, $e] = validate_order_input($valid);
check('valid lounge order accepted', $e === []);
check('normalised email/phone/airport/name', $d['email'] === 'budi@example.com' && $d['whatsapp'] === '+6281234567890' && $d['data']['airport'] === 'Soekarno-Hatta (CGK)' && $d['data']['adultNames'][1] === 'Siti Aminah');
[, $e] = validate_order_input(['acceptVoucherTiming' => false] + $valid);
check('lounge: voucher-timing acknowledgement required', ($e['acceptVoucherTiming'] ?? '') === 'errors.voucherTimingRequired');
[, $e] = validate_order_input(['adultQty' => 3, 'acceptTerms' => false] + $valid);
check('names must match quantity + terms required', ($e['adultNames'] ?? '') === 'errors.nameRequired' && ($e['acceptTerms'] ?? '') === 'errors.termsRequired');
[, $e] = validate_order_input(['email' => 'x', 'whatsapp' => '123', 'adultQty' => 0, 'childQty' => 0, 'adultNames' => [], 'childNames' => []] + $valid);
check('bad email/phone/zero pax', $e['email'] === 'errors.emailInvalid' && $e['whatsapp'] === 'errors.whatsappInvalid' && $e['adultQty'] === 'errors.passengerRequired');
[, $e] = validate_order_input(['adultNames' => ['<script>', 'X']] + $valid);
check('rejects bad names', isset($e['adultNames.0']) && isset($e['adultNames.1']));
check('sanitize', sanitize_text("  a\x00b <c>  d ") === 'a b c d');

// Dummy ticket
$today = local_today_from_offset(time(), -420); $dd = fn ($n) => add_days_iso($today, $n);
$pp = fn ($n) => ['name' => $n, 'dob' => '1990-01-01', 'passport' => 'c 123-4567', 'passportExpiry' => $dd(400)];
$tk = ['type' => 'ticket', 'tripType' => 'roundtrip', 'routes' => [['from' => 'Jakarta (CGK)', 'to' => 'Tokyo (NRT)', 'date' => $dd(30)], ['from' => 'Tokyo (NRT)', 'to' => 'Jakarta (CGK)', 'date' => $dd(37)]], 'usageDate' => $dd(5), 'adults' => 2, 'children' => 0, 'infants' => 1, 'passengers' => [$pp('Budi Santoso'), $pp('Siti Aminah'), $pp('Bayi Kecil')]] + $valid;
[$d, $e] = validate_order_input($tk);
check('valid round-trip ticket accepted', $e === [] && $d['data']['passengers'][0]['passport'] === 'C1234567' && $d['data']['airline'] === null);
check('ticket price: 3 pax round trip = 600,000', price_lines_ticket(2, 3)['total'] === 600000);
check('ticket price: 1 pax one way = 100,000; multi-city 4 routes = 400,000', price_lines_ticket(1, 1)['total'] === 100000 && price_lines_ticket(4, 1)['total'] === 400000);
[, $e] = validate_order_input(['tripType' => 'oneway'] + $tk);
check('one way needs exactly 1 route', ($e['routes'] ?? '') === 'errors.routeRequired');
[, $e] = validate_order_input(['routes' => [['from' => 'A1', 'to' => 'B1', 'date' => $dd(10)], ['from' => 'B1', 'to' => 'A1', 'date' => $dd(5)]]] + $tk);
check('route dates must be in order', ($e['routes.1.date'] ?? '') === 'errors.dateOrder');
[, $e] = validate_order_input(['routes' => [['from' => 'A1', 'to' => 'B1', 'date' => $dd(301)], ['from' => 'B1', 'to' => 'A1', 'date' => $dd(302)]], 'usageDate' => $dd(-1)] + $tk);
check('300-day window for routes and usage date', ($e['routes.0.date'] ?? '') === 'errors.dateRange300' && ($e['usageDate'] ?? '') === 'errors.dateRange300');
[, $e] = validate_order_input(['tripType' => 'multicity', 'routes' => array_fill(0, 6, ['from' => 'A1', 'to' => 'B1', 'date' => $dd(10)])] + $tk);
check('multi-city max 5 routes', ($e['routes'] ?? '') === 'errors.tooManyRoutes');
[, $e] = validate_order_input(['adults' => 0, 'infants' => 1, 'passengers' => [$pp('Bayi Kecil')]] + $tk);
check('ticket needs an adult', ($e['adults'] ?? '') === 'errors.adultRequired');
[, $e] = validate_order_input(['passengers' => [['name' => 'A B', 'dob' => $dd(1), 'passport' => '12', 'passportExpiry' => $today], $pp('Siti Aminah'), $pp('Bayi Kecil')]] + $tk);
check('dob / passport / expiry checks', ($e['passengers.0.dob'] ?? '') === 'errors.dobInvalid' && ($e['passengers.0.passport'] ?? '') === 'errors.passportInvalid' && ($e['passengers.0.passportExpiry'] ?? '') === 'errors.passportExpiryInvalid');

// Dummy hotel
$ht = ['type' => 'hotel', 'rooms' => 2, 'adults' => 2, 'children' => 1, 'infants' => 1, 'stays' => [['city' => 'Paris', 'hotel' => 'Ibis', 'checkIn' => $dd(10), 'checkOut' => $dd(13)], ['city' => 'Rome', 'checkIn' => $dd(13), 'checkOut' => $dd(16)]], 'guests' => [['name' => 'A Satu'], ['name' => 'B Dua'], ['name' => 'C Tiga'], ['name' => 'D Empat']]] + $valid;
[$d, $e] = validate_order_input($ht);
check('valid hotel order accepted', $e === [] && $d['data']['stays'][1]['hotel'] === null);
check('hotel price: 3 guests × 2 hotels = 600,000, infant free', price_lines_hotel(2, 2, 1, 1)['total'] === 600000 && price_lines_hotel(2, 2, 1, 1)['lines'][1]['sub'] === 0);
[, $e] = validate_order_input(['rooms' => 1, 'guests' => [['name' => 'A Satu'], ['name' => 'B Dua'], ['name' => 'C Tiga'], ['name' => 'D Empat']]] + $ht);
check('room rule: 1 room cannot hold 2 adults + 1 child', ($e['rooms'] ?? '') === 'errors.roomCapacity');
[, $e] = validate_order_input(['rooms' => 1, 'adults' => 1, 'children' => 1, 'infants' => 1, 'guests' => [['name' => 'A Satu'], ['name' => 'C Tiga'], ['name' => 'D Empat']]] + $ht);
check('room rule: 1 adult + 1 child + 1 infant fits', !isset($e['rooms']));
[, $e] = validate_order_input(['rooms' => 3, 'adults' => 2, 'children' => 0, 'infants' => 0, 'guests' => [['name' => 'A Satu'], ['name' => 'B Dua']]] + $ht);
check('room rule: every room needs an adult', ($e['rooms'] ?? '') === 'errors.roomsTooMany');
[, $e] = validate_order_input(['stays' => [['city' => 'Paris', 'checkIn' => $dd(10), 'checkOut' => $dd(10)]]] + $ht);
check('check-out at least 1 night after check-in', ($e['stays.0.checkOut'] ?? '') === 'errors.checkoutOrder');
[, $e] = validate_order_input(['stays' => array_fill(0, 6, ['city' => 'Paris', 'checkIn' => $dd(10), 'checkOut' => $dd(11)])] + $ht);
check('max 5 hotels', ($e['stays'] ?? '') === 'errors.tooManyStays');

// Order code + encrypted link
$secret = 'test-secret-test-secret-test-secret-123';
$code = derive_order_code($secret, 'key-1234567890abcdef', $now);
check('order code format', (bool) preg_match(ORDER_CODE_RE, $code) && str_starts_with($code, 'CLV-20261118-'));
check('prefixes per service', str_starts_with(derive_order_code($secret, 'key-1234567890abcdef', $now, 'DTK'), 'DTK-20261118-') && str_starts_with(derive_order_code($secret, 'key-1234567890abcdef', $now, 'DHT'), 'DHT-'));
$v2 = ['v' => 2, 'code' => $code, 'lang' => 'id', 'customer' => ['email' => 'x@y.z'], 'airport' => 'CGK', 'visitDate' => '2026-11-20', 'adultNames' => ['A B'], 'childNames' => [], 'price' => calculate_price(1, 0)];
check('old (v2) lounge links still open', (open_order(seal_order($v2, $secret), $secret)['data']['airport'] ?? '') === 'CGK');
check('same key → same code', $code === derive_order_code($secret, 'key-1234567890abcdef', $now));
$codes = []; for ($i = 0; $i < 2000; $i++) $codes[derive_order_code($secret, "key-$i-abcdefghijklmnop", $now)] = 1;
check('codes are spread out', count($codes) > 1960);
$order = ['v' => 3, 'type' => 'lounge', 'code' => $code, 'customer' => ['email' => 'budi@example.com'], 'data' => ['adultNames' => ['Budi Santoso']], 'price' => price_lines_lounge(2, 1)];
$tok = seal_order($order, $secret);
check('token round-trip', open_order($tok, $secret) === $order);
check('token hides personal data', !str_contains((string) base64url_decode($tok), 'Budi'));
$raw = base64url_decode($tok); $raw[20] = chr(ord($raw[20]) ^ 1);
check('tampered token rejected', open_order(base64url_encode($raw), $secret) === null);
check('wrong secret rejected', open_order($tok, 'another-secret-another-secret-12345') === null);
check('garbage rejected', open_order('garbage!', $secret) === null);

// Email
$o = ['v' => 3, 'type' => 'lounge', 'code' => 'CLV-20261118-AB2CD', 'lang' => 'id', 'customer' => ['name' => null, 'email' => 'budi@example.com', 'whatsapp' => '+6281234567890'], 'data' => ['airport' => 'Soekarno-Hatta <CGK> & Co', 'visitDate' => '2026-11-20', 'adultNames' => ['Budi Santoso', 'Siti Aminah'], 'childNames' => ['Rizky Putra']], 'price' => price_lines_lounge(2, 1), 'status' => 'PENDING_PAYMENT', 'orderUrl' => 'https://example.com/order.php?code=x&d=y'];
$m = render_order_email('ORDER_CONFIRMATION', $o);
check('lounge subject format', $m['subject'] === 'Airport Lounge Voucher Order Confirmation – CLV-20261118-AB2CD');
$all = true; foreach (['CLV-20261118-AB2CD', '+6281234567890', 'budi@example.com', 'Bandara: Soekarno-Hatta <CGK> & Co', 'Budi Santoso', 'Rizky Putra', 'Rp 400.000', 'Rp 175.000', 'Rp 575.000', 'Menunggu Pembayaran', 'Instruksi pembayaran', '+62 852-1300-9993', 'SATU KALI MASUK', '20 November 2026', 'maksimal pada hari H keberangkatan'] as $n) { if (!str_contains($m['text'], $n)) { echo "    missing: $n\n"; $all = false; } }
check('lounge email has all fields + voucher-timing notice', $all);
check('email HTML escapes data + shows timing box', str_contains($m['html'], 'Soekarno-Hatta &lt;CGK&gt; &amp; Co') && !str_contains($m['html'], '<CGK>') && str_contains($m['html'], 'Voucher dikirim maksimal pada hari H'));
$m2 = render_order_email('PAYMENT_SUBMITTED', ['lang' => 'en', 'status' => 'PAYMENT_SUBMITTED', 'payment' => ['fileName' => 'p.jpg', 'payerName' => 'Budi', 'note' => null]] + $o);
check('proof email (en)', str_contains($m2['subject'], 'Payment Proof Received') && str_contains($m2['text'], 'p.jpg (attached)') && !str_contains($m2['text'], 'Payment instructions'));
$tkData = validate_order_input($tk)[0]['data'];
$m3 = render_order_email('ORDER_CONFIRMATION', ['v' => 3, 'type' => 'ticket', 'code' => 'DTK-20261118-AB2CD', 'lang' => 'id', 'customer' => $o['customer'], 'data' => $tkData, 'price' => price_lines_ticket(2, 3), 'status' => 'PENDING_PAYMENT', 'orderUrl' => 'https://x']);
check('ticket email', $m3['subject'] === 'Dummy Ticket Order Confirmation – DTK-20261118-AB2CD' && str_contains($m3['text'], 'Pulang pergi') && str_contains($m3['text'], 'C1234567') && str_contains($m3['text'], 'Rp 600.000') && !str_contains($m3['text'], 'hari H'));
$htData = validate_order_input($ht)[0]['data'];
$m4 = render_order_email('ORDER_CONFIRMATION', ['v' => 3, 'type' => 'hotel', 'code' => 'DHT-20261118-AB2CD', 'lang' => 'en', 'customer' => $o['customer'], 'data' => $htData, 'price' => price_lines_hotel(2, 2, 1, 1), 'status' => 'PENDING_PAYMENT', 'orderUrl' => 'https://x']);
check('hotel email', $m4['subject'] === 'Dummy Hotel Order Confirmation – DHT-20261118-AB2CD' && str_contains($m4['text'], 'Paris — Ibis') && str_contains($m4['text'], 'Rome — Chosen by our team') && str_contains($m4['text'], '3 nights') && str_contains($m4['text'], 'Free'));
check('default: internal addresses as CC', copy_recipients() === ['cc' => INTERNAL_CC_EMAILS, 'bcc' => []]);
$GLOBALS['APP_CONFIG']['internal_copy'] = 'bcc';
$GLOBALS['APP_CONFIG']['email_extra_cc'] = 'jasatiketmurah@gmail.com';
$GLOBALS['APP_CONFIG']['email_extra_bcc'] = ['ops@example.com'];
check('bcc mode: internal addresses hidden, never also in CC', copy_recipients() === ['cc' => [], 'bcc' => [...INTERNAL_CC_EMAILS, 'ops@example.com']]);
unset($GLOBALS['APP_CONFIG']['internal_copy'], $GLOBALS['APP_CONFIG']['email_extra_cc'], $GLOBALS['APP_CONFIG']['email_extra_bcc']);
check('file type sniffing', sniff_mime("\xFF\xD8\xFF\xE0") === 'image/jpeg' && sniff_mime('%PDF-1.7') === 'application/pdf' && sniff_mime('hello') === null);

// Translations: same keys in both languages
$flat = function (array $a, string $p = '') use (&$flat): array { $o = []; foreach ($a as $k => $v) { $o[] = $p . $k; if (is_array($v)) $o = array_merge($o, $flat($v, "$p$k.")); } return $o; };
check('id/en translation keys match', $flat(dict('id')) === $flat(dict('en')));

echo "\n$pass passed, $fail failed\n";
exit($fail ? 1 : 0);
