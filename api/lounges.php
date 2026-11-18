<?php
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';

require_method('GET');
rate_limit_or_429('lounges', 60, 60);
try {
    $r = get_lounges_for_airport((string) ($_GET['iata'] ?? ''));
    $status = match ($r['status']) { 'ok' => 200, 'airport_not_found' => 404, 'not_configured' => 503, default => 502 };
    json_response(['ok' => $r['status'] === 'ok'] + $r, $status);
} catch (Throwable $e) {
    log_event('error', 'lounge_list_failed', ['error' => $e->getMessage()]);
    json_error(500, 'errors.server');
}
