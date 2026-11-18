<?php
declare(strict_types=1);

/** Read a config value by dotted path: cfg('smtp.host'). */
function cfg(string $path, mixed $default = null): mixed
{
    $cur = $GLOBALS['APP_CONFIG'] ?? [];
    foreach (explode('.', $path) as $k) {
        if (!is_array($cur) || !array_key_exists($k, $cur)) return $default;
        $cur = $cur[$k];
    }
    return $cur;
}

/** HTML-escape for output. */
function e(mixed $v): string
{
    return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function app_url(): string
{
    $u = (string) cfg('app_url', '');
    if ($u === '' && isset($_SERVER['HTTP_HOST'])) {
        $u = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
    }
    return rtrim($u, '/');
}

/** URL of a file in this site, with a cache-busting version for assets. */
function url(string $path): string
{
    $path = ltrim($path, '/');
    $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    if (str_ends_with($base, '/api')) $base = substr($base, 0, -4);
    return $base . '/' . $path;
}

function asset(string $path): string
{
    $file = WEB_ROOT . '/' . ltrim($path, '/');
    return url($path) . (is_file($file) ? '?v=' . filemtime($file) : '');
}

function json_response(array $data, int $status = 200, array $headers = []): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    foreach ($headers as $k => $v) header("$k: $v");
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(int $status, string $errorKey, array $extra = []): never
{
    json_response(['ok' => false, 'error' => $errorKey] + $extra, $status);
}

function require_method(string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== $method) {
        json_response(['ok' => false, 'error' => 'errors.generic'], 405, ['Allow' => $method]);
    }
}

function client_ip(): string
{
    // cPanel/Apache: REMOTE_ADDR is the real client unless behind a proxy/CDN.
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return substr((string) $ip, 0, 64);
}

/** Structured log line in storage/logs/app.log (no secrets, no full customer data). */
function log_event(string $level, string $event, array $data = []): void
{
    $line = json_encode(['time' => date('c'), 'level' => $level, 'event' => $event] + $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    @file_put_contents(STORAGE . '/logs/app.log', $line . "\n", FILE_APPEND | LOCK_EX);
}

function send_security_headers(): void
{
    if (headers_sent()) return;
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        header('Strict-Transport-Security: max-age=63072000; includeSubDomains');
    }
}

function base64url_encode(string $s): string
{
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function base64url_decode(string $s): string|false
{
    if (!preg_match('/^[A-Za-z0-9_-]*$/', $s)) return false;
    return base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4), true);
}
