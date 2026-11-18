<?php
declare(strict_types=1);

/**
 * WhatsApp number → E.164 ("+6281234567890"). Defaults to Indonesia (+62):
 * "0812…" and "812…" become "+62812…". International numbers need "+" (or "00") and country code.
 */
function normalize_whatsapp(string $input): ?string
{
    $raw = trim($input);
    if ($raw === '') return null;
    $hasPlus = str_starts_with($raw, '+') || str_starts_with($raw, '00');
    $digits = preg_replace('/\D+/', '', $raw);
    if (str_starts_with($raw, '00')) $digits = substr($digits, 2);

    if (!$hasPlus) {
        if (str_starts_with($digits, '62')) {
            // already has the Indonesian country code without "+"
        } elseif (str_starts_with($digits, '0')) {
            $digits = '62' . substr($digits, 1);
        } elseif (str_starts_with($digits, '8')) {
            $digits = '62' . $digits;
        } else {
            return null;
        }
    }
    if (!preg_match('/^[1-9]\d{7,14}$/', $digits)) return null;
    if (str_starts_with($digits, '62') && !preg_match('/^628\d{8,11}$/', $digits)) return null; // mobile only
    return '+' . $digits;
}
