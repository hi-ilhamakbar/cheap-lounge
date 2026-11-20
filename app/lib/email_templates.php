<?php
declare(strict_types=1);

/**
 * Bilingual order emails for all services. Kinds: ORDER_CONFIRMATION, PAYMENT_SUBMITTED.
 * $o = v3 order record + 'status', 'orderUrl', optional 'payment'.
 */

function email_strings(string $lang): array
{
    $id = [
        'intro' => [
            'ORDER_CONFIRMATION' => 'Terima kasih! Pesanan Anda telah kami terima. Silakan selesaikan pembayaran melalui QRIS.',
            'PAYMENT_SUBMITTED' => 'Bukti pembayaran Anda telah kami terima (terlampir). Tim kami akan memverifikasi pembayaran dan menghubungi Anda melalui email atau WhatsApp.',
        ],
        'status' => ['PENDING_PAYMENT' => 'Menunggu Pembayaran', 'PAYMENT_SUBMITTED' => 'Bukti Pembayaran Dikirim'],
        'orderId' => 'ID Pesanan', 'service' => 'Layanan', 'statusLabel' => 'Status pembayaran', 'price' => 'Rincian harga', 'total' => 'Total pembayaran',
        'payTitle' => 'Instruksi pembayaran',
        'paySteps' => [
            'Buka halaman pesanan melalui tombol di bawah, lalu scan QRIS ' . BRAND_NAME . ' (NMID ' . QRIS_NMID . ').',
            'Bayar tepat sesuai total pembayaran.',
            'Unggah bukti pembayaran di halaman pesanan. Tim kami akan memverifikasi pembayaran Anda secara manual.',
        ],
        'open' => 'Buka halaman pesanan',
        'singleEntry' => 'Setiap voucher lounge hanya berlaku untuk SATU KALI MASUK per penumpang, tidak dapat digunakan ulang, dan bukan keanggotaan atau akses tanpa batas.',
        'proof' => 'Bukti pembayaran', 'payer' => 'Nama pengirim', 'note' => 'Catatan', 'attached' => 'terlampir',
        'support' => 'Butuh bantuan? Hubungi kami via WhatsApp',
        'proofSubject' => 'Bukti Pembayaran Diterima',
    ];
    $en = [
        'intro' => [
            'ORDER_CONFIRMATION' => 'Thank you! We have received your order. Please complete your payment via QRIS.',
            'PAYMENT_SUBMITTED' => 'We have received your payment proof (attached). Our team will verify the payment and contact you by email or WhatsApp.',
        ],
        'status' => ['PENDING_PAYMENT' => 'Pending Payment', 'PAYMENT_SUBMITTED' => 'Payment Submitted'],
        'orderId' => 'Order ID', 'service' => 'Service', 'statusLabel' => 'Payment status', 'price' => 'Price breakdown', 'total' => 'Total payment',
        'payTitle' => 'Payment instructions',
        'paySteps' => [
            'Open your order page using the button below and scan the ' . BRAND_NAME . ' QRIS (NMID ' . QRIS_NMID . ').',
            'Pay exactly the total payment amount.',
            'Upload your payment proof on the order page. Our team will verify your payment manually.',
        ],
        'open' => 'Open order page',
        'singleEntry' => 'Each lounge voucher is valid for a SINGLE ENTRY per passenger only. It cannot be reused and is not a membership or unlimited-access pass.',
        'proof' => 'Payment proof', 'payer' => 'Sender name', 'note' => 'Note', 'attached' => 'attached',
        'support' => 'Need help? Contact us on WhatsApp',
        'proofSubject' => 'Payment Proof Received',
    ];
    return $lang === 'en' ? $en : $id;
}

function email_subject(string $kind, array $o): string
{
    $code = $o['code'];
    $svc = ['lounge' => 'Airport Lounge Voucher', 'ticket' => 'Dummy Ticket', 'hotel' => 'Dummy Hotel'][$o['type']];
    if ($kind === 'ORDER_CONFIRMATION') return "$svc Order Confirmation – $code";
    return email_strings($o['lang'])['proofSubject'] . " – $svc – $code";
}

/** @return array{subject:string, html:string, text:string} */
function render_order_email(string $kind, array $o): array
{
    $lang = $o['lang'];
    $t = email_strings($lang);
    $view = order_sections($o, $lang);
    $subject = email_subject($kind, $o);
    $status = $t['status'][$o['status']] ?? $o['status'];
    $isLounge = $o['type'] === 'lounge';
    $showPay = $kind === 'ORDER_CONFIRMATION';
    $total = format_idr((int) $o['price']['total'], $lang);

    $row = fn (string $l, string $v) => '<tr><td style="padding:6px 0;color:#64748b;font-size:14px;width:42%;vertical-align:top;white-space:pre">' . e($l) . '</td><td style="padding:6px 0;color:#0f1b3d;font-size:14px;font-weight:600">' . e($v) . '</td></tr>';
    $h3 = fn (string $title) => '<h3 style="margin:28px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b91c1c">' . e($title) . '</h3>';
    $table = fn (string $inner) => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $inner . '</table>';

    $sectionsHtml = '';
    foreach ($view['sections'] as $s) $sectionsHtml .= $h3($s['title']) . $table(implode('', array_map(fn ($r) => $row($r[0], $r[1]), $s['rows'])));

    $priceRows = '';
    foreach ($o['price']['lines'] as $l) $priceRows .= $row(price_line_label($l, $lang), price_line_amount($l, $lang));
    $priceRows .= '<tr><td style="padding:12px 0 0;border-top:1px solid #e2e8f0;font-size:15px;color:#0f1b3d;font-weight:700">' . e($t['total']) . '</td><td style="padding:12px 0 0;border-top:1px solid #e2e8f0;font-size:18px;color:#0f1b3d;font-weight:800">' . e($total) . '</td></tr>';

    $timingBox = $isLounge
        ? '<div style="margin:0 0 20px;padding:18px 20px;background:#fef3c7;border:2px solid #f59e0b;border-radius:12px"><div style="font-size:16px;font-weight:800;color:#92400e;line-height:1.4">⚠ ' . e(t('voucherTiming.title', $lang)) . '</div><div style="margin-top:6px;font-size:14px;color:#78350f;line-height:1.6">' . e(t('voucherTiming.body', $lang)) . '</div></div>'
        : '';

    $paymentBox = '';
    if (!empty($o['payment'])) {
        $pm = $o['payment'];
        $paymentBox = '<p style="margin:0 0 16px;padding:12px 14px;background:#ecfdf5;border-radius:10px;color:#065f46;font-size:14px"><strong>' . e($t['proof']) . ':</strong> ' . e($pm['fileName']) . ' (' . e($t['attached']) . ')'
            . (!empty($pm['payerName']) ? '<br><strong>' . e($t['payer']) . ':</strong> ' . e($pm['payerName']) : '')
            . (!empty($pm['note']) ? '<br><strong>' . e($t['note']) . ':</strong> ' . e($pm['note']) : '') . '</p>';
    }
    $payHtml = $showPay ? $h3($t['payTitle']) . '<ol style="margin:0;padding-left:20px;color:#0f1b3d;font-size:14px;line-height:1.7">' . implode('', array_map(fn ($s) => '<li>' . e($s) . '</li>', $t['paySteps'])) . '</ol>' : '';
    $notes = $isLounge
        ? '<p style="margin:24px 0 0;padding:14px 16px;background:#fff7ed;border-radius:10px;color:#7c2d12;font-size:13px;line-height:1.6">' . e($t['singleEntry']) . '</p><p style="margin:12px 0 0;color:#64748b;font-size:12px;line-height:1.6">' . e(t('lounge.availability', $lang)) . '</p>'
        : '<p style="margin:24px 0 0;padding:14px 16px;background:#f8fafc;border-radius:10px;color:#334155;font-size:13px;line-height:1.6">' . e(implode(' ', t($o['type'] . '.rules', $lang))) . '</p>';

    $html = '<!doctype html><html lang="' . e($lang) . '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . e($subject) . '</title></head>'
        . '<body style="margin:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 12px"><tr><td align="center">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">'
        . '<tr><td style="background:#0f1b3d;padding:28px 32px"><div style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:.04em">' . e(BRAND_NAME) . '</div><div style="color:#cbd5e1;font-size:13px;margin-top:4px">' . e($view['service']) . '</div></td></tr>'
        . '<tr><td style="padding:28px 32px 8px">'
        . $timingBox
        . '<p style="margin:0 0 16px;color:#0f1b3d;font-size:15px;line-height:1.6">' . e($t['intro'][$kind]) . '</p>' . $paymentBox
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:16px 18px">' . $row($t['orderId'], $o['code']) . $row($t['service'], $view['service']) . $row($t['statusLabel'], $status) . '</table>'
        . $sectionsHtml . $h3($t['price']) . $table($priceRows) . $payHtml
        . '<p style="margin:28px 0 8px;text-align:center"><a href="' . e($o['orderUrl']) . '" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px">' . e($t['open']) . '</a></p>'
        . $notes . '</td></tr>'
        . '<tr><td style="padding:24px 32px 32px;color:#64748b;font-size:13px;line-height:1.6;border-top:1px solid #eef2f7">' . e($t['support']) . ': <a href="' . WHATSAPP_URL . '" style="color:#0f1b3d;font-weight:700">' . e(WHATSAPP_DISPLAY) . '</a><br>' . e(BRAND_NAME) . ' · QRIS NMID ' . e(QRIS_NMID) . '</td></tr>'
        . '</table></td></tr></table></body></html>';

    $lines = [BRAND_NAME . ' — ' . $view['service'], ''];
    if ($isLounge) array_push($lines, '*** ' . t('voucherTiming.title', $lang) . ' ***', t('voucherTiming.body', $lang), '');
    $lines[] = $t['intro'][$kind];
    if (!empty($o['payment'])) {
        $lines[] = "{$t['proof']}: {$o['payment']['fileName']} ({$t['attached']})";
        if (!empty($o['payment']['payerName'])) $lines[] = "{$t['payer']}: {$o['payment']['payerName']}";
        if (!empty($o['payment']['note'])) $lines[] = "{$t['note']}: {$o['payment']['note']}";
    }
    array_push($lines, '', "{$t['orderId']}: {$o['code']}", "{$t['service']}: {$view['service']}", "{$t['statusLabel']}: $status");
    foreach ($view['sections'] as $s) {
        $lines[] = '';
        $lines[] = mb_strtoupper($s['title']);
        foreach ($s['rows'] as $r) $lines[] = "{$r[0]}: {$r[1]}";
    }
    $lines[] = '';
    $lines[] = mb_strtoupper($t['price']);
    foreach ($o['price']['lines'] as $l) $lines[] = '  ' . price_line_label($l, $lang) . ' = ' . price_line_amount($l, $lang);
    $lines[] = "  {$t['total']}: $total";
    $lines[] = '';
    if ($showPay) {
        $lines[] = $t['payTitle'];
        foreach ($t['paySteps'] as $i => $s) $lines[] = '  ' . ($i + 1) . ". $s";
        $lines[] = '';
    }
    $lines[] = "{$t['open']}: {$o['orderUrl']}";
    $lines[] = '';
    if ($isLounge) array_push($lines, $t['singleEntry'], t('lounge.availability', $lang));
    else $lines[] = implode(' ', t($o['type'] . '.rules', $lang));
    array_push($lines, '', "{$t['support']}: " . WHATSAPP_DISPLAY . ' (' . WHATSAPP_URL . ')');
    return ['subject' => $subject, 'html' => $html, 'text' => implode("\n", $lines)];
}
