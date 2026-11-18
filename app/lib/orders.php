<?php
declare(strict_types=1);

/*
 * NO DATABASE. The confirmation email (to the customer, CC to both internal addresses) IS the order
 * record. If it cannot be sent, the order is refused and the customer is asked to retry — a retry uses
 * the same idempotency key, so it gets the same Order ID and can never create a duplicate.
 */

final class OrderError extends RuntimeException
{
    public function __construct(public readonly string $key, public readonly int $status = 400, public readonly ?string $field = null)
    {
        parent::__construct($key);
    }
}

function order_link(array $order, string $token): string
{
    return app_url() . '/order.php?code=' . rawurlencode($order['code']) . '&d=' . $token;
}

function send_order_email(string $kind, array $order, string $token, string $dedupeKey, ?array $payment = null, array $attachments = []): array
{
    $status = $kind === 'ORDER_CONFIRMATION' ? 'PENDING_PAYMENT' : 'PAYMENT_SUBMITTED';
    $mail = render_order_email($kind, $order + ['status' => $status, 'orderUrl' => order_link($order, $token), 'payment' => $payment]);
    return send_email($order['customer']['email'], $mail['subject'], $mail['html'], $mail['text'], $dedupeKey, $attachments);
}

/** @return array{orderCode:string, token:string} */
function create_order(array $in): array
{
    $secret = order_secret();
    if (!is_within_booking_window($in['visitDate'], local_today_from_offset(time(), $in['tzOffsetMinutes']))) {
        throw new OrderError('errors.dateOutOfRange', 400, 'visitDate');
    }
    $price = calculate_price($in['adultQty'], $in['childQty']); // ALWAYS recalculated on the server

    $order = [
        'v' => 2,
        'code' => derive_order_code($secret, $in['idempotencyKey']),
        'createdAt' => date('c'),
        'lang' => $in['language'],
        'customer' => ['name' => $in['customerName'], 'email' => $in['email'], 'whatsapp' => $in['whatsapp']],
        'airport' => $in['airport'],          // free text, as written by the customer
        'lounge' => $in['lounge'],            // free text or null (= our team chooses)
        'visitDate' => $in['visitDate'],
        'adultNames' => $in['adultNames'],
        'childNames' => $in['childNames'],
        'price' => $price,
    ];
    $token = seal_order($order, $secret);

    $r = send_order_email('ORDER_CONFIRMATION', $order, $token, $order['code'] . '-ORDER_CONFIRMATION');
    if (!$r['ok']) {
        log_event('error', 'order_email_failed', ['orderCode' => $order['code'], 'error' => $r['error'] ?? '']);
        throw new OrderError('errors.orderEmailFailed', 502);
    }
    log_event('info', 'order_created', ['orderCode' => $order['code'], 'total' => $price['totalAmount'], 'duplicate' => !empty($r['duplicate'])]);
    return ['orderCode' => $order['code'], 'token' => $token];
}

function read_order(string $code, string $token): ?array
{
    if ($code === '' || $token === '') return null;
    $o = open_order($token, order_secret());
    return $o && hash_equals($o['code'], $code) ? $o : null;
}

/** Real file type from magic bytes (never trust the browser's MIME type). */
function sniff_mime(string $b): ?string
{
    if (strncmp($b, "\xFF\xD8\xFF", 3) === 0) return 'image/jpeg';
    if (strncmp($b, "\x89PNG", 4) === 0) return 'image/png';
    if (substr($b, 0, 4) === 'RIFF' && substr($b, 8, 4) === 'WEBP') return 'image/webp';
    if (strncmp($b, '%PDF-', 5) === 0) return 'application/pdf';
    return null;
}

/**
 * Emails the payment proof as an attachment to the customer, CC both internal addresses.
 * Staff verify against the QRIS merchant account and reply by email/WhatsApp. Never marks "paid".
 */
function submit_payment_proof(string $code, string $token, ?array $file, string $payerName, string $note): void
{
    $order = read_order($code, $token);
    if (!$order) throw new OrderError('errors.generic', 404);
    if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) throw new OrderError('errors.fileRequired', 400, 'file');
    if (in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || ($file['size'] ?? 0) > MAX_PROOF_BYTES) throw new OrderError('errors.fileTooLarge', 400, 'file');
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) throw new OrderError('errors.fileRequired', 400, 'file');

    $content = (string) file_get_contents($file['tmp_name']);
    $mime = sniff_mime($content);
    if (!$mime || !isset(ALLOWED_PROOF_MIME[$mime])) throw new OrderError('errors.fileType', 400, 'file');
    $filename = $order['code'] . '-payment-proof.' . ALLOWED_PROOF_MIME[$mime];

    // Same file for the same order → sent once (duplicate submissions are ignored).
    $r = send_order_email('PAYMENT_SUBMITTED', $order, $token, $order['code'] . '-PROOF-' . hash('sha256', $content),
        ['fileName' => $filename, 'payerName' => $payerName ?: null, 'note' => $note ?: null],
        [['filename' => $filename, 'content' => $content, 'mime' => $mime]]);
    if (!$r['ok']) {
        log_event('error', 'payment_proof_email_failed', ['orderCode' => $order['code'], 'error' => $r['error'] ?? '']);
        throw new OrderError('errors.proofEmailFailed', 502);
    }
    log_event('info', 'payment_proof_submitted', ['orderCode' => $order['code'], 'duplicate' => !empty($r['duplicate'])]);
}
