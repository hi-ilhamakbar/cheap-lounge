<?php
declare(strict_types=1);

/**
 * Bilingual order emails. Kinds: ORDER_CONFIRMATION, PAYMENT_SUBMITTED.
 * $o = order record (see orders.php) + 'status', 'orderUrl', optional 'payment'.
 */

function email_strings(string $lang): array
{
    $id = [
        'intro' => [
            'ORDER_CONFIRMATION' => 'Terima kasih! Pesanan voucher lounge bandara Anda telah kami terima. Silakan selesaikan pembayaran melalui QRIS.',
            'PAYMENT_SUBMITTED' => 'Bukti pembayaran Anda telah kami terima (terlampir). Tim kami akan memverifikasi pembayaran dan menghubungi Anda melalui email atau WhatsApp.',
        ],
        'status' => ['PENDING_PAYMENT' => 'Menunggu Pembayaran', 'PAYMENT_SUBMITTED' => 'Bukti Pembayaran Dikirim'],
        'orderId' => 'ID Pesanan', 'statusLabel' => 'Status pembayaran', 'customer' => 'Data pemesan', 'name' => 'Nama',
        'whatsapp' => 'WhatsApp', 'email' => 'Email', 'lounge' => 'Detail lounge', 'airport' => 'Bandara', 'loungeName' => 'Lounge yang diinginkan',
        'chosen' => 'Dipilihkan oleh tim kami', 'visitDate' => 'Tanggal kunjungan', 'passengers' => 'Penumpang', 'adults' => 'Dewasa', 'children' => 'Anak',
        'adultN' => 'Dewasa', 'childN' => 'Anak', 'price' => 'Rincian harga', 'total' => 'Total pembayaran', 'payTitle' => 'Instruksi pembayaran',
        'paySteps' => [
            'Buka halaman pesanan melalui tombol di bawah, lalu scan QRIS ' . BRAND_NAME . ' (NMID ' . QRIS_NMID . ').',
            'Bayar tepat sesuai total pembayaran.',
            'Unggah bukti pembayaran di halaman pesanan. Tim kami akan memverifikasi pembayaran Anda secara manual.',
        ],
        'open' => 'Buka halaman pesanan',
        'singleEntry' => 'Penting: setiap voucher hanya berlaku untuk SATU KALI MASUK per penumpang, tidak dapat digunakan ulang, dan bukan keanggotaan atau akses tanpa batas.',
        'notConfirmation' => 'Ketersediaan lounge akan dikonfirmasi oleh tim kami melalui email atau WhatsApp. Akses tunduk pada ketentuan dan kapasitas lounge.',
        'proof' => 'Bukti pembayaran', 'payer' => 'Nama pengirim', 'note' => 'Catatan', 'attached' => 'terlampir',
        'support' => 'Butuh bantuan? Hubungi kami via WhatsApp', 'na' => '-',
    ];
    $en = [
        'intro' => [
            'ORDER_CONFIRMATION' => 'Thank you! We have received your airport lounge voucher order. Please complete your payment via QRIS.',
            'PAYMENT_SUBMITTED' => 'We have received your payment proof (attached). Our team will verify the payment and contact you by email or WhatsApp.',
        ],
        'status' => ['PENDING_PAYMENT' => 'Pending Payment', 'PAYMENT_SUBMITTED' => 'Payment Submitted'],
        'orderId' => 'Order ID', 'statusLabel' => 'Payment status', 'customer' => 'Customer details', 'name' => 'Name',
        'whatsapp' => 'WhatsApp', 'email' => 'Email', 'lounge' => 'Lounge details', 'airport' => 'Airport', 'loungeName' => 'Preferred lounge',
        'chosen' => 'Chosen by our team', 'visitDate' => 'Visit date', 'passengers' => 'Passengers', 'adults' => 'Adults', 'children' => 'Children',
        'adultN' => 'Adult', 'childN' => 'Child', 'price' => 'Price breakdown', 'total' => 'Total payment', 'payTitle' => 'Payment instructions',
        'paySteps' => [
            'Open your order page using the button below and scan the ' . BRAND_NAME . ' QRIS (NMID ' . QRIS_NMID . ').',
            'Pay exactly the total payment amount.',
            'Upload your payment proof on the order page. Our team will verify your payment manually.',
        ],
        'open' => 'Open order page',
        'singleEntry' => 'Important: each voucher is valid for a SINGLE ENTRY per passenger only. It cannot be reused and is not a membership or unlimited-access pass.',
        'notConfirmation' => 'Our team will confirm lounge availability by email or WhatsApp. Access is subject to lounge conditions and capacity.',
        'proof' => 'Payment proof', 'payer' => 'Sender name', 'note' => 'Note', 'attached' => 'attached',
        'support' => 'Need help? Contact us on WhatsApp', 'na' => '-',
    ];
    return $lang === 'en' ? $en : $id;
}

function email_subject(string $kind, string $code, string $lang): string
{
    if ($kind === 'ORDER_CONFIRMATION') return "Airport Lounge Voucher Order Confirmation – $code";
    return $lang === 'id' ? "Bukti Pembayaran Diterima – Airport Lounge Voucher – $code" : "Payment Proof Received – Airport Lounge Voucher – $code";
}

/** @return array{subject:string, html:string, text:string} */
function render_order_email(string $kind, array $o): array
{
    $lang = $o['lang'];
    $t = email_strings($lang);
    $p = $o['price'];
    $subject = email_subject($kind, $o['code'], $lang);
    $status = $t['status'][$o['status']] ?? $o['status'];
    $visit = format_visit_date($o['visitDate'], $lang);
    $money = fn (int $n) => format_idr($n, $lang);
    $showPay = $kind === 'ORDER_CONFIRMATION';
    $loungeText = $o['lounge'] ?? null;

    $row = fn (string $l, string $v) => '<tr><td style="padding:6px 0;color:#64748b;font-size:14px;width:42%;vertical-align:top">' . e($l) . '</td><td style="padding:6px 0;color:#0f1b3d;font-size:14px;font-weight:600">' . e($v) . '</td></tr>';
    $section = fn (string $title, string $inner) => '<h3 style="margin:28px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b91c1c">' . e($title) . '</h3><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $inner . '</table>';

    $pax = '';
    foreach ($o['adultNames'] as $i => $n) $pax .= $row($t['adultN'] . ' ' . ($i + 1), $n);
    foreach ($o['childNames'] as $i => $n) $pax .= $row($t['childN'] . ' ' . ($i + 1), $n);

    $priceRows = ($p['adultQty'] ? $row("{$t['adults']} {$p['adultQty']} × " . $money($p['adultUnitPrice']), $money($p['adultSubtotal'])) : '')
        . ($p['childQty'] ? $row("{$t['children']} {$p['childQty']} × " . $money($p['childUnitPrice']), $money($p['childSubtotal'])) : '')
        . '<tr><td style="padding:12px 0 0;border-top:1px solid #e2e8f0;font-size:15px;color:#0f1b3d;font-weight:700">' . e($t['total']) . '</td><td style="padding:12px 0 0;border-top:1px solid #e2e8f0;font-size:18px;color:#0f1b3d;font-weight:800">' . e($money($p['totalAmount'])) . '</td></tr>';

    $customer = ($o['customer']['name'] ? $row($t['name'], $o['customer']['name']) : '') . $row($t['whatsapp'], $o['customer']['whatsapp']) . $row($t['email'], $o['customer']['email']);
    $loungeRows = $row($t['airport'], $o['airport']) . $row($t['loungeName'], $loungeText ?? $t['chosen']) . $row($t['visitDate'], $visit);

    $paymentBox = '';
    if (!empty($o['payment'])) {
        $pm = $o['payment'];
        $paymentBox = '<p style="margin:0 0 16px;padding:12px 14px;background:#ecfdf5;border-radius:10px;color:#065f46;font-size:14px"><strong>' . e($t['proof']) . ':</strong> ' . e($pm['fileName']) . ' (' . e($t['attached']) . ')'
            . (!empty($pm['payerName']) ? '<br><strong>' . e($t['payer']) . ':</strong> ' . e($pm['payerName']) : '')
            . (!empty($pm['note']) ? '<br><strong>' . e($t['note']) . ':</strong> ' . e($pm['note']) : '') . '</p>';
    }
    $payHtml = $showPay ? '<h3 style="margin:28px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b91c1c">' . e($t['payTitle']) . '</h3><ol style="margin:0;padding-left:20px;color:#0f1b3d;font-size:14px;line-height:1.7">' . implode('', array_map(fn ($s) => '<li>' . e($s) . '</li>', $t['paySteps'])) . '</ol>' : '';

    $html = '<!doctype html><html lang="' . e($lang) . '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . e($subject) . '</title></head>'
        . '<body style="margin:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 12px"><tr><td align="center">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">'
        . '<tr><td style="background:#0f1b3d;padding:28px 32px"><div style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:.04em">' . e(BRAND_NAME) . '</div><div style="color:#cbd5e1;font-size:13px;margin-top:4px">Airport Lounge Voucher</div></td></tr>'
        . '<tr><td style="padding:28px 32px 8px">'
        . '<p style="margin:0 0 16px;color:#0f1b3d;font-size:15px;line-height:1.6">' . e($t['intro'][$kind]) . '</p>' . $paymentBox
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:16px 18px">' . $row($t['orderId'], $o['code']) . $row($t['statusLabel'], $status) . '</table>'
        . $section($t['customer'], $customer) . $section($t['lounge'], $loungeRows)
        . $section("{$t['passengers']} — {$t['adults']}: {$p['adultQty']}, {$t['children']}: {$p['childQty']}", $pax)
        . $section($t['price'], $priceRows) . $payHtml
        . '<p style="margin:28px 0 8px;text-align:center"><a href="' . e($o['orderUrl']) . '" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px">' . e($t['open']) . '</a></p>'
        . '<p style="margin:24px 0 0;padding:14px 16px;background:#fff7ed;border-radius:10px;color:#7c2d12;font-size:13px;line-height:1.6">' . e($t['singleEntry']) . '</p>'
        . '<p style="margin:12px 0 0;color:#64748b;font-size:12px;line-height:1.6">' . e($t['notConfirmation']) . '</p></td></tr>'
        . '<tr><td style="padding:24px 32px 32px;color:#64748b;font-size:13px;line-height:1.6;border-top:1px solid #eef2f7">' . e($t['support']) . ': <a href="' . WHATSAPP_URL . '" style="color:#0f1b3d;font-weight:700">' . e(WHATSAPP_DISPLAY) . '</a><br>' . e(BRAND_NAME) . ' · QRIS NMID ' . e(QRIS_NMID) . '</td></tr>'
        . '</table></td></tr></table></body></html>';

    $lines = [BRAND_NAME . ' — Airport Lounge Voucher', '', $t['intro'][$kind]];
    if (!empty($o['payment'])) {
        $lines[] = "{$t['proof']}: {$o['payment']['fileName']} ({$t['attached']})";
        if (!empty($o['payment']['payerName'])) $lines[] = "{$t['payer']}: {$o['payment']['payerName']}";
        if (!empty($o['payment']['note'])) $lines[] = "{$t['note']}: {$o['payment']['note']}";
    }
    array_push($lines, '', "{$t['orderId']}: {$o['code']}", "{$t['statusLabel']}: $status", '', $t['customer']);
    if ($o['customer']['name']) $lines[] = "{$t['name']}: {$o['customer']['name']}";
    array_push($lines, "{$t['whatsapp']}: {$o['customer']['whatsapp']}", "{$t['email']}: {$o['customer']['email']}", '',
        "{$t['airport']}: {$o['airport']}", "{$t['loungeName']}: " . ($loungeText ?? $t['chosen']),
        "{$t['visitDate']}: $visit", '',
        "{$t['passengers']} — {$t['adults']}: {$p['adultQty']}, {$t['children']}: {$p['childQty']}");
    foreach ($o['adultNames'] as $i => $n) $lines[] = "  {$t['adultN']} " . ($i + 1) . ": $n";
    foreach ($o['childNames'] as $i => $n) $lines[] = "  {$t['childN']} " . ($i + 1) . ": $n";
    $lines[] = '';
    $lines[] = $t['price'];
    if ($p['adultQty']) $lines[] = "  {$t['adults']} {$p['adultQty']} × " . $money($p['adultUnitPrice']) . ' = ' . $money($p['adultSubtotal']);
    if ($p['childQty']) $lines[] = "  {$t['children']} {$p['childQty']} × " . $money($p['childUnitPrice']) . ' = ' . $money($p['childSubtotal']);
    $lines[] = "  {$t['total']}: " . $money($p['totalAmount']);
    $lines[] = '';
    if ($showPay) {
        $lines[] = $t['payTitle'];
        foreach ($t['paySteps'] as $i => $s) $lines[] = '  ' . ($i + 1) . ". $s";
        $lines[] = '';
    }
    array_push($lines, "{$t['open']}: {$o['orderUrl']}", '', $t['singleEntry'], $t['notConfirmation'], '', "{$t['support']}: " . WHATSAPP_DISPLAY . ' (' . WHATSAPP_URL . ')');

    return ['subject' => $subject, 'html' => $html, 'text' => implode("\n", $lines)];
}
