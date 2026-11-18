<?php
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';

require_method('POST');
rate_limit_or_429('payment-proof', 8, 600);

// Upload larger than post_max_size → PHP drops the whole body.
if (empty($_POST) && empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) json_error(413, 'errors.fileTooLarge', ['fields' => ['file' => 'errors.fileTooLarge']]);

try {
    submit_payment_proof(
        (string) ($_POST['code'] ?? ''),
        (string) ($_POST['d'] ?? ''),
        $_FILES['file'] ?? null,
        mb_substr(sanitize_text((string) ($_POST['payerName'] ?? '')), 0, 100),
        mb_substr(sanitize_text((string) ($_POST['note'] ?? '')), 0, 500),
    );
    json_response(['ok' => true]);
} catch (OrderError $e) {
    json_error($e->status, $e->key, $e->field ? ['fields' => [$e->field => $e->key]] : []);
} catch (Throwable $e) {
    log_event('error', 'payment_proof_failed', ['error' => $e->getMessage()]);
    json_error(500, 'errors.server');
}
