<?php
declare(strict_types=1);

/** Strip control chars & angle brackets, collapse whitespace. Output is still escaped with e(). */
function sanitize_text(string $s): string
{
    $s = preg_replace('/[\x00-\x1F\x7F<>]/u', ' ', $s) ?? '';
    return trim(preg_replace('/\s+/u', ' ', $s) ?? '');
}

function validate_passenger_name(mixed $v): array
{
    if (!is_string($v) || preg_match('/[<>]/', $v)) return [null, 'errors.nameInvalid'];
    $n = sanitize_text($v);
    if (mb_strlen($n) < 2) return [null, 'errors.nameRequired'];
    if (mb_strlen($n) > 100) return [null, 'errors.nameTooLong'];
    if (!preg_match("/^[\\p{L}\\p{M}][\\p{L}\\p{M} .'\\-]*$/u", $n)) return [null, 'errors.nameInvalid'];
    return [$n, null];
}

function clean_text_field(mixed $v, int $max): string
{
    return mb_substr(sanitize_text(is_string($v) ? $v : ''), 0, $max + 1);
}

function int_in(mixed $v, int $min, int $max): ?int
{
    $n = is_int($v) ? $v : (is_string($v) && preg_match('/^\d{1,3}$/', $v) ? (int) $v : null);
    return $n !== null && $n >= $min && $n <= $max ? $n : null;
}

/** Fields shared by every service: contact, language, idempotency key, timezone, terms. */
function validate_common(array $in, array &$err): array
{
    $out = [];
    $key = $in['idempotencyKey'] ?? '';
    if (!is_string($key) || !preg_match('/^[A-Za-z0-9-]{16,100}$/', $key)) $err['idempotencyKey'] = 'errors.generic';
    $out['idempotencyKey'] = (string) $key;

    $lang = $in['language'] ?? 'id';
    $out['language'] = in_array($lang, LANGS, true) ? $lang : 'id';

    $name = is_string($in['customerName'] ?? null) ? mb_substr(sanitize_text($in['customerName']), 0, 100) : '';
    $out['customerName'] = $name !== '' ? $name : null;

    $email = strtolower(trim((string) ($in['email'] ?? '')));
    if ($email === '') $err['email'] = 'errors.emailRequired';
    elseif (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) $err['email'] = 'errors.emailInvalid';
    $out['email'] = $email;

    $waRaw = (string) ($in['whatsapp'] ?? '');
    $out['whatsapp'] = null;
    if (trim(preg_replace('/^\+62\s*$/', '', trim($waRaw))) === '') $err['whatsapp'] = 'errors.whatsappRequired';
    elseif (($wa = normalize_whatsapp($waRaw)) === null) $err['whatsapp'] = 'errors.whatsappInvalid';
    else $out['whatsapp'] = $wa;

    $tz = $in['tzOffsetMinutes'] ?? null;
    $tz = is_int($tz) ? $tz : (is_string($tz) && preg_match('/^-?\d{1,3}$/', $tz) ? (int) $tz : null);
    if (!is_valid_tz_offset($tz)) $err['tzOffsetMinutes'] = 'errors.generic';
    $out['tzOffsetMinutes'] = (int) $tz;
    $out['localToday'] = local_today_from_offset(time(), (int) $tz);

    if (($in['acceptTerms'] ?? false) !== true) $err['acceptTerms'] = 'errors.termsRequired';
    return $out;
}

function validate_date_in(mixed $v, string $min, string $max): bool
{
    return is_string($v) && is_valid_iso_date($v) && $v >= $min && $v <= $max;
}

/** Airport lounge voucher. */
function validate_lounge_input(array $in, array &$err): array
{
    $out = [];
    $airport = sanitize_text(is_string($in['airport'] ?? null) ? $in['airport'] : '');
    if (mb_strlen($airport) < 2) $err['airport'] = 'errors.airportRequired';
    elseif (mb_strlen($airport) > 120) $err['airport'] = 'errors.airportTooLong';
    $out['airport'] = $airport;

    $visit = (string) ($in['visitDate'] ?? '');
    if (!is_valid_iso_date($visit)) $err['visitDate'] = 'errors.dateRequired';
    $out['visitDate'] = $visit;

    foreach (['adult', 'child'] as $kind) {
        $q = int_in($in[$kind . 'Qty'] ?? null, 0, MAX_PASSENGERS_PER_TYPE);
        if ($q === null) $err[$kind . 'Qty'] = 'errors.tooManyPassengers';
        $out[$kind . 'Qty'] = $q ?? 0;
        $names = $in[$kind . 'Names'] ?? [];
        $clean = [];
        if (!is_array($names) || count($names) !== $out[$kind . 'Qty']) $err[$kind . 'Names'] = 'errors.nameRequired';
        else foreach (array_values($names) as $i => $n) {
            [$v, $e] = validate_passenger_name($n);
            if ($e) $err["{$kind}Names.$i"] = $e;
            $clean[] = $v;
        }
        $out[$kind . 'Names'] = $clean;
    }
    if (!isset($err['adultQty'], $err['childQty']) && $out['adultQty'] + $out['childQty'] < 1) $err['adultQty'] = 'errors.passengerRequired';
    if (($in['acceptVoucherTiming'] ?? false) !== true) $err['acceptVoucherTiming'] = 'errors.voucherTimingRequired';
    return $out;
}

/** Full years of age on a given date (YYYY-MM-DD). */
function age_on(string $dob, string $on): int
{
    [$y1, $m1, $d1] = array_map('intval', explode('-', $dob));
    [$y2, $m2, $d2] = array_map('intval', explode('-', $on));
    return $y2 - $y1 - (($m2 < $m1 || ($m2 === $m1 && $d2 < $d1)) ? 1 : 0);
}

/** Adult ≥ 12, child 2–11, infant < 2 — on the departure date. */
function age_category_error(string $type, int $age): ?string
{
    return match ($type) {
        'adult' => $age >= ADULT_MIN_AGE ? null : 'errors.ageAdult',
        'child' => $age >= INFANT_MAX_AGE_EXCLUSIVE && $age < ADULT_MIN_AGE ? null : 'errors.ageChild',
        'infant' => $age >= 0 && $age < INFANT_MAX_AGE_EXCLUSIVE ? null : 'errors.ageInfant',
    };
}

/** @return array<string, array{0:string,1:string}> ISO code => [Indonesian name, English name] */
function country_list(): array
{
    static $c = null;
    return $c ??= require APP_ROOT . '/data/countries.php';
}

function country_name(string $code, string $lang): string
{
    $c = country_list()[$code] ?? null;
    return $c ? $c[$lang === 'en' ? 1 : 0] : $code;
}

/** Dummy ticket (flight reservation). */
function validate_ticket_input(array $in, array &$err, string $today): array
{
    $out = [];
    $max = add_days_iso($today, DUMMY_WINDOW_DAYS);
    $trip = $in['tripType'] ?? '';
    if (!in_array($trip, ['oneway', 'roundtrip', 'multicity'], true)) { $err['tripType'] = 'errors.tripTypeRequired'; $trip = 'oneway'; }
    $out['tripType'] = $trip;

    $routes = is_array($in['routes'] ?? null) ? array_values($in['routes']) : [];
    $need = ['oneway' => [1, 1], 'roundtrip' => [2, 2], 'multicity' => [2, TICKET_MAX_ROUTES]][$trip];
    if (count($routes) < $need[0] || count($routes) > $need[1]) $err['routes'] = count($routes) > TICKET_MAX_ROUTES ? 'errors.tooManyRoutes' : 'errors.routeRequired';
    $clean = [];
    $prev = $today;
    foreach (array_slice($routes, 0, TICKET_MAX_ROUTES) as $i => $r) {
        $r = is_array($r) ? $r : [];
        $from = clean_text_field($r['from'] ?? '', 80);
        $to = clean_text_field($r['to'] ?? '', 80);
        $date = (string) ($r['date'] ?? '');
        if (mb_strlen($from) < 2) $err["routes.$i.from"] = 'errors.routeRequired';
        elseif (mb_strlen($from) > 80) $err["routes.$i.from"] = 'errors.textTooLong';
        if (mb_strlen($to) < 2) $err["routes.$i.to"] = 'errors.routeRequired';
        elseif (mb_strlen($to) > 80) $err["routes.$i.to"] = 'errors.textTooLong';
        if (!validate_date_in($date, $today, $max)) $err["routes.$i.date"] = 'errors.dateRange300';
        elseif ($date < $prev) $err["routes.$i.date"] = 'errors.dateOrder';
        else $prev = $date;
        $clean[] = ['from' => $from, 'to' => $to, 'date' => $date];
    }
    $out['routes'] = $clean;

    // Preferred airline is no longer a field — customers write wishes in the optional note.
    $note = mb_substr(trim(preg_replace('/[\x00-\x09\x0B-\x1F\x7F<>]/u', ' ', is_string($in['note'] ?? null) ? $in['note'] : '') ?? ''), 0, 501);
    if (mb_strlen($note) > 500) $err['note'] = 'errors.noteTooLong';
    $out['note'] = $note !== '' ? $note : null;

    $usage = (string) ($in['usageDate'] ?? '');
    if (!validate_date_in($usage, $today, $max)) $err['usageDate'] = 'errors.dateRange300';
    $out['usageDate'] = $usage;

    $counts = [];
    foreach (['adults', 'children', 'infants'] as $k) {
        $counts[$k] = int_in($in[$k] ?? null, 0, PAX_SELECT_MAX);
        if ($counts[$k] === null) { $err[$k] = 'errors.paxRange'; $counts[$k] = 0; }
    }
    if (!isset($err['adults']) && $counts['adults'] < 1) $err['adults'] = 'errors.adultRequired';
    if (!isset($err['infants']) && $counts['infants'] > $counts['adults']) $err['infants'] = 'errors.infantsPerAdult';
    $out += $counts;

    $expected = array_merge(array_fill(0, $counts['adults'], 'adult'), array_fill(0, $counts['children'], 'child'), array_fill(0, $counts['infants'], 'infant'));
    $pax = is_array($in['passengers'] ?? null) ? array_values($in['passengers']) : [];
    if (count($pax) !== count($expected)) $err['passengers'] = 'errors.nameRequired';
    // Ages and passport validity are checked against the first departure date (not the booking date).
    $depart = isset($clean[0]) && is_valid_iso_date($clean[0]['date']) ? $clean[0]['date'] : null;
    $countries = country_list();
    $cleanPax = [];
    foreach ($expected as $i => $type) {
        $p = is_array($pax[$i] ?? null) ? $pax[$i] : [];
        [$name, $e] = validate_passenger_name($p['name'] ?? '');
        if ($e) $err["passengers.$i.name"] = $e;
        $gender = $p['gender'] ?? '';
        if (!in_array($gender, ['M', 'F'], true)) $err["passengers.$i.gender"] = 'errors.genderRequired';
        $nat = strtoupper((string) ($p['nationality'] ?? ''));
        if (!isset($countries[$nat])) $err["passengers.$i.nationality"] = 'errors.nationalityRequired';
        $dob = (string) ($p['dob'] ?? '');
        if (!is_valid_iso_date($dob) || $dob > $today || $dob < '1900-01-01') $err["passengers.$i.dob"] = 'errors.dobInvalid';
        elseif ($depart && ($ageErr = age_category_error($type, age_on($dob, $depart)))) $err["passengers.$i.dob"] = $ageErr;
        $pp = strtoupper(preg_replace('/[\s-]+/', '', (string) ($p['passport'] ?? '')));
        if (!preg_match('/^[A-Z0-9]{5,20}$/', $pp)) $err["passengers.$i.passport"] = 'errors.passportInvalid';
        $exp = (string) ($p['passportExpiry'] ?? '');
        if (!is_valid_iso_date($exp) || $exp <= $today) $err["passengers.$i.passportExpiry"] = 'errors.passportExpiryInvalid';
        elseif ($depart && $exp < add_days_iso($depart, PASSPORT_MIN_VALID_DAYS)) $err["passengers.$i.passportExpiry"] = 'errors.passport180';
        $cleanPax[] = ['type' => $type, 'name' => $name, 'gender' => $gender, 'nationality' => $nat, 'dob' => $dob, 'passport' => $pp, 'passportExpiry' => $exp];
    }
    $out['passengers'] = $cleanPax;
    return $out;
}

/** Dummy hotel. */
function validate_hotel_input(array $in, array &$err, string $today): array
{
    $out = [];
    $max = add_days_iso($today, DUMMY_WINDOW_DAYS);
    foreach (['rooms' => [1, PAX_SELECT_MAX], 'adults' => [0, PAX_SELECT_MAX], 'children' => [0, PAX_SELECT_MAX], 'infants' => [0, PAX_SELECT_MAX]] as $k => [$lo, $hi]) {
        $out[$k] = int_in($in[$k] ?? null, $lo, $hi);
        if ($out[$k] === null) { $err[$k] = 'errors.paxRange'; $out[$k] = $lo; }
    }
    [$R, $A, $C, $I] = [$out['rooms'], $out['adults'], $out['children'], $out['infants']];
    if (!isset($err['adults']) && $A < 1) $err['adults'] = 'errors.adultRequired';
    elseif ($A < $R) $err['rooms'] = 'errors.roomsTooMany';
    // Per room: 2 adults (+1 infant) or 1 adult + 1 child (+1 infant).
    elseif ($A + $C > 2 * $R || $I > $R) $err['rooms'] = 'errors.roomCapacity';

    $stays = is_array($in['stays'] ?? null) ? array_values($in['stays']) : [];
    if (count($stays) < 1) $err['stays'] = 'errors.cityRequired';
    if (count($stays) > HOTEL_MAX_STAYS) $err['stays'] = 'errors.tooManyStays';
    $clean = [];
    foreach (array_slice($stays, 0, HOTEL_MAX_STAYS) as $i => $s) {
        $s = is_array($s) ? $s : [];
        $city = clean_text_field($s['city'] ?? '', 80);
        $hotel = clean_text_field($s['hotel'] ?? '', 100);
        if (mb_strlen($city) < 2) $err["stays.$i.city"] = 'errors.cityRequired';
        elseif (mb_strlen($city) > 80) $err["stays.$i.city"] = 'errors.textTooLong';
        if (mb_strlen($hotel) > 100) $err["stays.$i.hotel"] = 'errors.textTooLong';
        $in_ = (string) ($s['checkIn'] ?? '');
        $outD = (string) ($s['checkOut'] ?? '');
        if (!validate_date_in($in_, $today, $max)) $err["stays.$i.checkIn"] = 'errors.dateRange300';
        elseif (!validate_date_in($outD, add_days_iso($in_, 1), $max)) $err["stays.$i.checkOut"] = 'errors.checkoutOrder';
        $clean[] = ['city' => $city, 'hotel' => $hotel !== '' ? $hotel : null, 'checkIn' => $in_, 'checkOut' => $outD];
    }
    $out['stays'] = $clean;

    $expected = array_merge(array_fill(0, $A, 'adult'), array_fill(0, $C, 'child'), array_fill(0, $I, 'infant'));
    $guests = is_array($in['guests'] ?? null) ? array_values($in['guests']) : [];
    if (count($guests) !== count($expected)) $err['guests'] = 'errors.nameRequired';
    $cleanG = [];
    foreach ($expected as $i => $type) {
        [$name, $e] = validate_passenger_name(is_array($guests[$i] ?? null) ? ($guests[$i]['name'] ?? '') : '');
        if ($e) $err["guests.$i.name"] = $e;
        $cleanG[] = ['type' => $type, 'name' => $name];
    }
    $out['guests'] = $cleanG;
    return $out;
}

/**
 * Validates and normalises an order request for any service. Returns [array $data, array $fieldErrors].
 * Field errors are i18n keys, e.g. ['passengers.0.passport' => 'errors.passportInvalid'].
 */
function validate_order_input(array $in): array
{
    $err = [];
    $type = $in['type'] ?? 'lounge';
    if (!in_array($type, ['lounge', 'ticket', 'hotel'], true)) $type = 'lounge';
    $common = validate_common($in, $err);
    $data = match ($type) {
        'lounge' => validate_lounge_input($in, $err),
        'ticket' => validate_ticket_input($in, $err, $common['localToday']),
        'hotel' => validate_hotel_input($in, $err, $common['localToday']),
    };
    return [['type' => $type] + $common + ['data' => $data], $err];
}
