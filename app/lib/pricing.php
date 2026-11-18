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
