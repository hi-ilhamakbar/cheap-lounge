<?php
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';

require_method('GET');
rate_limit_or_429('airport-search', 60, 60);
$q = mb_substr(trim((string) ($_GET['q'] ?? '')), 0, 60);
if (mb_strlen($q) < 2) json_response(['ok' => true, 'airports' => []]);
try {
    json_response(['ok' => true, 'airports' => search_airports($q)]);
} catch (Throwable $e) {
    log_event('error', 'airport_search_failed', ['error' => $e->getMessage()]);
    json_error(502, 'errors.server');
}
