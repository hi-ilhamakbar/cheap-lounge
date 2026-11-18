<?php
declare(strict_types=1);

function is_valid_iso_date(string $iso): bool
{
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $iso, $m)) return false;
    return checkdate((int) $m[2], (int) $m[3], (int) $m[1]);
}

function add_days_iso(string $iso, int $days): string
{
    return (new DateTimeImmutable($iso . ' 00:00:00', new DateTimeZone('UTC')))->modify(($days >= 0 ? '+' : '') . $days . ' days')->format('Y-m-d');
}

/**
 * Customer's local "today" from the browser's Date#getTimezoneOffset() (minutes, UTC − local;
 * Jakarta = -420).
 */
function local_today_from_offset(int $nowTs, int $tzOffsetMinutes): string
{
    return gmdate('Y-m-d', $nowTs - $tzOffsetMinutes * 60);
}

function is_valid_tz_offset(mixed $n): bool
{
    return is_int($n) && $n >= -840 && $n <= 720;
}

function booking_window(string $localToday): array
{
    return ['min' => $localToday, 'max' => add_days_iso($localToday, BOOKING_WINDOW_DAYS)];
}

function is_within_booking_window(string $visitDate, string $localToday): bool
{
    if (!is_valid_iso_date($visitDate) || !is_valid_iso_date($localToday)) return false;
    $w = booking_window($localToday);
    return $visitDate >= $w['min'] && $visitDate <= $w['max'];
}

/** "Jumat, 20 November 2026" / "Friday, 20 November 2026" — no intl extension required. */
function format_visit_date(string $iso, string $lang): string
{
    $d = new DateTimeImmutable($iso . ' 00:00:00', new DateTimeZone('UTC'));
    $days = [
        'id' => ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
        'en' => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    ];
    $months = [
        'id' => ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
        'en' => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    ];
    $l = $lang === 'en' ? 'en' : 'id';
    return $days[$l][(int) $d->format('w')] . ', ' . (int) $d->format('j') . ' ' . $months[$l][(int) $d->format('n') - 1] . ' ' . $d->format('Y');
}
