<?php
declare(strict_types=1);

/** File-based fixed-window rate limiter (storage/ratelimit). Works on shared hosting without a database. */
function rate_limit_check(string $key, int $limit, int $windowSeconds): array
{
    $dir = STORAGE . '/ratelimit';
    @mkdir($dir, 0750, true);
    $file = $dir . '/' . hash('sha256', $key) . '.json';
    $fh = @fopen($file, 'c+');
    if (!$fh) return ['allowed' => true, 'retryAfter' => 0]; // fail open, never block customers on disk issues
    flock($fh, LOCK_EX);
    $now = time();
    $state = json_decode((string) stream_get_contents($fh), true);
    if (!is_array($state) || ($state['reset'] ?? 0) < $now) $state = ['count' => 0, 'reset' => $now + $windowSeconds];
    $state['count']++;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($state));
    flock($fh, LOCK_UN);
    fclose($fh);
    if (random_int(1, 200) === 1) rate_limit_gc($dir);
    return ['allowed' => $state['count'] <= $limit, 'retryAfter' => max(1, $state['reset'] - $now)];
}

function rate_limit_gc(string $dir): void
{
    foreach (glob($dir . '/*.json') ?: [] as $f) if (filemtime($f) < time() - 86400) @unlink($f);
}

/** For API endpoints: responds 429 and stops when the client exceeded the limit. */
function rate_limit_or_429(string $bucket, int $limit, int $windowSeconds): void
{
    $r = rate_limit_check($bucket . ':' . client_ip(), $limit, $windowSeconds);
    if (!$r['allowed']) json_response(['ok' => false, 'error' => 'errors.rateLimited'], 429, ['Retry-After' => (string) $r['retryAfter']]);
}
