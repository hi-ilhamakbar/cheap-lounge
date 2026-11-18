<?php
declare(strict_types=1);

/**
 * Loaded by every page and API endpoint. No database, no Composer, no build step:
 * plain PHP 8.1+ with the openssl, curl and mbstring extensions (standard on cPanel).
 */

define('APP_ROOT', __DIR__);
define('WEB_ROOT', dirname(__DIR__));
define('STORAGE', WEB_ROOT . '/storage');

ini_set('display_errors', '0');
ini_set('log_errors', '1');
@mkdir(STORAGE . '/logs', 0750, true);
ini_set('error_log', STORAGE . '/logs/php-error.log');
date_default_timezone_set('Asia/Jakarta');
mb_internal_encoding('UTF-8');

// Config: outside public_html first (safest), then app/config.php.
$GLOBALS['APP_CONFIG'] = (static function (): array {
    $outside = dirname(WEB_ROOT) . '/cheaplounge-config.php';
    foreach ([$outside, APP_ROOT . '/config.php'] as $f) {
        if (is_file($f)) {
            $c = require $f;
            if (is_array($c)) return $c;
        }
    }
    return [];
})();

require_once APP_ROOT . '/lib/helpers.php';
require_once APP_ROOT . '/lib/business.php';
require_once APP_ROOT . '/lib/i18n.php';
require_once APP_ROOT . '/lib/pricing.php';
require_once APP_ROOT . '/lib/dates.php';
require_once APP_ROOT . '/lib/phone.php';
require_once APP_ROOT . '/lib/validation.php';
require_once APP_ROOT . '/lib/order_token.php';
require_once APP_ROOT . '/lib/ratelimit.php';
require_once APP_ROOT . '/lib/email_templates.php';
require_once APP_ROOT . '/lib/mailer.php';
require_once APP_ROOT . '/lib/orders.php';

if (PHP_SAPI !== 'cli') {
    i18n_handle_switch();
    send_security_headers();
}
