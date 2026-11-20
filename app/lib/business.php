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

// ── Dummy ticket (flight reservation) ──────────────────────────────────────
// One way Rp 100.000 / person, round trip Rp 200.000 / person (= Rp 100.000 per route per person).
// Multi-city follows the same rule: Rp 100.000 per route per person. Same price for adult / child / infant.
const TICKET_PRICE_PER_ROUTE_IDR = 100000;
const TICKET_MAX_ROUTES = 5;
const DUMMY_WINDOW_DAYS = 300;            // travel / stay dates: today … today + 300 days
const PAX_SELECT_MAX = 9;                 // drop-downs 0–9

// ── Dummy hotel ─────────────────────────────────────────────────────────────
// Rp 100.000 per person per hotel (adults and children); infants free.
const HOTEL_PRICE_PER_GUEST_IDR = 100000;
const HOTEL_MAX_STAYS = 5;

/** Order ID prefix per service. */
const ORDER_PREFIX = ['lounge' => 'CLV', 'ticket' => 'DTK', 'hotel' => 'DHT'];
