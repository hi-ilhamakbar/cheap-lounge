<?php
declare(strict_types=1);

/**
 * Total = (adults × 200,000) + (children × 175,000). The server ALWAYS recalculates this.
 * @throws InvalidArgumentException
 */
function calculate_price(int $adultQty, int $childQty): array
{
    foreach (['adultQty' => $adultQty, 'childQty' => $childQty] as $label => $q) {
        if ($q < 0 || $q > MAX_PASSENGERS_PER_TYPE) {
            throw new InvalidArgumentException("$label must be between 0 and " . MAX_PASSENGERS_PER_TYPE);
        }
    }
    if ($adultQty + $childQty < 1) throw new InvalidArgumentException('At least one passenger is required');
    $adultSubtotal = $adultQty * PRICE_ADULT_IDR;
    $childSubtotal = $childQty * PRICE_CHILD_IDR;
    return [
        'adultQty' => $adultQty,
        'childQty' => $childQty,
        'adultUnitPrice' => PRICE_ADULT_IDR,
        'childUnitPrice' => PRICE_CHILD_IDR,
        'adultSubtotal' => $adultSubtotal,
        'childSubtotal' => $childSubtotal,
        'totalAmount' => $adultSubtotal + $childSubtotal,
        'currency' => 'IDR',
    ];
}

/** "Rp 575.000" (id) / "IDR 575,000" (en) */
function format_idr(int $amount, string $lang = 'id'): string
{
    return $lang === 'id' ? 'Rp ' . number_format($amount, 0, ',', '.') : 'IDR ' . number_format($amount, 0, '.', ',');
}

/*
 * Generic price lines stored in every order: ['k' => label key, 'qty' => n, 'unit' => IDR, 'sub' => IDR, 'p' => params].
 * Labels are translated at display time (price_line_label) so emails use the order language.
 */
function price_lines_lounge(int $adults, int $children): array
{
    $p = calculate_price($adults, $children);
    $lines = [];
    if ($adults) $lines[] = ['k' => 'adult', 'qty' => $adults, 'unit' => PRICE_ADULT_IDR, 'sub' => $p['adultSubtotal']];
    if ($children) $lines[] = ['k' => 'child', 'qty' => $children, 'unit' => PRICE_CHILD_IDR, 'sub' => $p['childSubtotal']];
    return ['lines' => $lines, 'total' => $p['totalAmount']];
}

/** Dummy ticket: Rp 100.000 × routes × passengers (adults, children and infants all count). */
function price_lines_ticket(int $routes, int $passengers): array
{
    if ($routes < 1 || $routes > TICKET_MAX_ROUTES) throw new InvalidArgumentException('routes out of range');
    if ($passengers < 1 || $passengers > 3 * PAX_SELECT_MAX) throw new InvalidArgumentException('passengers out of range');
    $unit = TICKET_PRICE_PER_ROUTE_IDR * $routes; // per person
    return ['lines' => [['k' => 'ticketPax', 'qty' => $passengers, 'unit' => $unit, 'sub' => $unit * $passengers, 'p' => ['legs' => $routes]]], 'total' => $unit * $passengers];
}

/** Dummy hotel: Rp 100.000 × (adults + children) × hotels; infants free. */
function price_lines_hotel(int $hotels, int $adults, int $children, int $infants): array
{
    if ($hotels < 1 || $hotels > HOTEL_MAX_STAYS) throw new InvalidArgumentException('hotels out of range');
    $guests = $adults + $children;
    if ($guests < 1) throw new InvalidArgumentException('at least one guest');
    $sub = HOTEL_PRICE_PER_GUEST_IDR * $guests * $hotels;
    $lines = [['k' => 'hotelGuest', 'qty' => $guests, 'unit' => HOTEL_PRICE_PER_GUEST_IDR, 'sub' => $sub, 'p' => ['hotels' => $hotels]]];
    if ($infants) $lines[] = ['k' => 'hotelInfant', 'qty' => $infants, 'unit' => 0, 'sub' => 0, 'p' => ['hotels' => $hotels]];
    return ['lines' => $lines, 'total' => $sub];
}

function price_line_label(array $l, string $lang): string
{
    $money = format_idr((int) $l['unit'], $lang);
    return match ($l['k']) {
        'adult' => t('booking.adultLine', $lang) . " {$l['qty']} × $money",
        'child' => t('booking.childLine', $lang) . " {$l['qty']} × $money",
        'ticketPax' => tf(t('ticket.priceLine', $lang), ['qty' => $l['qty'], 'unit' => $money]) . ' (' . tf(t('ticket.routesLine', $lang), ['legs' => $l['p']['legs']]) . ')',
        'hotelGuest' => tf(t('hotel.priceLine', $lang), ['qty' => $l['qty'], 'hotels' => $l['p']['hotels'], 'unit' => $money]),
        'hotelInfant' => tf(t('hotel.infantLine', $lang), ['qty' => $l['qty'], 'hotels' => $l['p']['hotels']]),
        default => (string) $l['k'],
    };
}

function price_line_amount(array $l, string $lang): string
{
    return (int) $l['sub'] === 0 && $l['k'] === 'hotelInfant' ? t('form.free', $lang) : format_idr((int) $l['sub'], $lang);
}
