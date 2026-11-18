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

/**
 * Validates and normalises an order request. Returns [array $data, array $fieldErrors].
 * Field errors are i18n keys, e.g. ['adultNames.0' => 'errors.nameRequired'].
 */
function validate_order_input(array $in): array
{
    $err = [];
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
    if (trim(preg_replace('/^\+62\s*$/', '', trim($waRaw))) === '') $err['whatsapp'] = 'errors.whatsappRequired';
    else {
        $wa = normalize_whatsapp($waRaw);
        if ($wa === null) $err['whatsapp'] = 'errors.whatsappInvalid';
        $out['whatsapp'] = $wa;
    }

    // Free text: the customer writes the airport and (optionally) the lounge they want.
    $airport = sanitize_text(is_string($in['airport'] ?? null) ? $in['airport'] : '');
    if (mb_strlen($airport) < 2) $err['airport'] = 'errors.airportRequired';
    elseif (mb_strlen($airport) > 120) $err['airport'] = 'errors.airportTooLong';
    $out['airport'] = $airport;

    $lounge = sanitize_text(is_string($in['lounge'] ?? null) ? $in['lounge'] : '');
    if (mb_strlen($lounge) > 150) $err['lounge'] = 'errors.loungeTooLong';
    $out['lounge'] = $lounge !== '' ? $lounge : null;

    $visit = (string) ($in['visitDate'] ?? '');
    if (!is_valid_iso_date($visit)) $err['visitDate'] = 'errors.dateRequired';
    $out['visitDate'] = $visit;

    $tz = $in['tzOffsetMinutes'] ?? null;
    $tz = is_numeric($tz) && (string) (int) $tz === (string) $tz ? (int) $tz : (is_int($tz) ? $tz : null);
    if (!is_valid_tz_offset($tz)) $err['tzOffsetMinutes'] = 'errors.generic';
    $out['tzOffsetMinutes'] = (int) $tz;

    foreach (['adult', 'child'] as $kind) {
        $q = $in[$kind . 'Qty'] ?? null;
        $q = is_int($q) ? $q : (is_string($q) && ctype_digit($q) ? (int) $q : -1);
        if ($q < 0) $err[$kind . 'Qty'] = 'errors.generic';
        elseif ($q > MAX_PASSENGERS_PER_TYPE) $err[$kind . 'Qty'] = 'errors.tooManyPassengers';
        $out[$kind . 'Qty'] = max(0, $q);

        $names = $in[$kind . 'Names'] ?? [];
        $clean = [];
        if (!is_array($names) || count($names) !== $out[$kind . 'Qty']) {
            $err[$kind . 'Names'] = 'errors.nameRequired';
        } else {
            foreach (array_values($names) as $i => $n) {
                [$v, $e] = validate_passenger_name($n);
                if ($e) $err["{$kind}Names.$i"] = $e;
                $clean[] = $v;
            }
        }
        $out[$kind . 'Names'] = $clean;
    }
    if (!isset($err['adultQty'], $err['childQty']) && $out['adultQty'] + $out['childQty'] < 1) $err['adultQty'] = 'errors.passengerRequired';

    if (($in['acceptTerms'] ?? false) !== true) $err['acceptTerms'] = 'errors.termsRequired';

    return [$out, $err];
}
