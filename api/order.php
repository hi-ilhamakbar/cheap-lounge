<?php
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';

require_method('POST');
rate_limit_or_429('create-order', 10, 600);

$body = json_decode((string) file_get_contents('php://input', false, null, 0, 64 * 1024), true);
if (!is_array($body)) json_error(400, 'errors.generic');

[$input, $errors] = validate_order_input($body);
if ($errors) json_error(422, 'errors.fixFields', ['fields' => $errors]);

try {
    json_response(['ok' => true] + create_order($input), 201);
} catch (OrderError $e) {
    json_error($e->status, $e->key, $e->field ? ['fields' => [$e->field => $e->key]] : []);
} catch (Throwable $e) {
    log_event('error', 'order_create_failed', ['error' => $e->getMessage()]);
    json_error(500, 'errors.server');
}
