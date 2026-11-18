<?php
declare(strict_types=1);

/** Mandatory business rules (project requirements §6, §9, §10, §16). Used server-side for every order. */
const BRAND_NAME = 'JASA TIKET MURAH';
const PRICE_ADULT_IDR = 200000;
const PRICE_CHILD_IDR = 175000;
const CHILD_MAX_AGE_EXCLUSIVE = 12;       // child = under 12; 12+ = adult
const BOOKING_WINDOW_DAYS = 90;           // today … today + 90 days
const MAX_PASSENGERS_PER_TYPE = 10;
const WHATSAPP_NUMBER = '6285213009993';
const WHATSAPP_DISPLAY = '+62 852-1300-9993';
const WHATSAPP_URL = 'https://wa.me/6285213009993';
const INTERNAL_CC_EMAILS = ['airportloungevoucher@gmail.com', 'jasatiketmurah@gmail.com'];
const QRIS_IMAGE = 'qris/qris-jasa-tiket-murah.jpg';
const QRIS_WIDTH = 874;
const QRIS_HEIGHT = 1240;
const QRIS_MERCHANT = 'JASA TIKET MURAH';
const QRIS_NMID = 'ID1025423279625';
const QRIS_CATEGORY = 'A01';
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROOF_MIME = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'application/pdf' => 'pdf'];

function whatsapp_link(string $message): string
{
    return WHATSAPP_URL . '?text=' . rawurlencode($message);
}
