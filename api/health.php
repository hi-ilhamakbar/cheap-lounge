<?php
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';

/** Configuration check — reports presence only, never secret values. */
$checks = [
    'php' => PHP_VERSION,
    'extensions' => array_combine($ext = ['openssl', 'curl', 'mbstring', 'zlib', 'json'], array_map('extension_loaded', $ext)),
    'config' => is_array($GLOBALS['APP_CONFIG']) && $GLOBALS['APP_CONFIG'] !== [] ? 'loaded' : 'missing',
    'orderSecret' => strlen((string) cfg('order_secret', '')) >= 32 ? 'configured' : 'missing',
    'email' => smtp_configured() ? 'smtp' : 'missing',
    'loungeProvider' => lounge_provider_mode(),
    'storageWritable' => is_writable(STORAGE),
];
$ok = $checks['orderSecret'] === 'configured' && $checks['email'] === 'smtp' && $checks['loungeProvider'] !== 'none'
    && $checks['storageWritable'] && !in_array(false, $checks['extensions'], true);
json_response(['ok' => $ok] + $checks, $ok ? 200 : 503);
