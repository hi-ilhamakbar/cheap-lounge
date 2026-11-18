<?php
declare(strict_types=1);

const LANGS = ['id', 'en'];
const DEFAULT_LANG = 'id';

/** ?lang=en|id sets a 1-year cookie and reloads the same URL without the parameter. */
function i18n_handle_switch(): void
{
    $want = $_GET['lang'] ?? null;
    if (!is_string($want) || !in_array($want, LANGS, true)) return;
    setcookie('lang', $want, ['expires' => time() + 31536000, 'path' => '/', 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off']);
    $_COOKIE['lang'] = $want;
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' && !str_contains((string) ($_SERVER['SCRIPT_NAME'] ?? ''), '/api/')) {
        $params = $_GET;
        unset($params['lang']);
        $path = strtok((string) ($_SERVER['REQUEST_URI'] ?? '/'), '?');
        header('Location: ' . $path . ($params ? '?' . http_build_query($params) : ''), true, 302);
        exit;
    }
}

function current_lang(): string
{
    $c = $_COOKIE['lang'] ?? DEFAULT_LANG;
    return in_array($c, LANGS, true) ? $c : DEFAULT_LANG;
}

/** Whole dictionary for a language. */
function dict(?string $lang = null): array
{
    static $cache = [];
    $lang ??= current_lang();
    return $cache[$lang] ??= require APP_ROOT . '/lang/' . $lang . '.php';
}

/** t('hero.title') → string (or array for list keys). Unknown keys fall back to errors.generic. */
function t(string $path, ?string $lang = null): mixed
{
    $cur = dict($lang);
    foreach (explode('.', $path) as $k) {
        if (!is_array($cur) || !array_key_exists($k, $cur)) return dict($lang)['errors']['generic'];
        $cur = $cur[$k];
    }
    return $cur;
}

/** "Step {n} of {total}" */
function tf(string $template, array $vars): string
{
    return preg_replace_callback('/\{(\w+)\}/', fn ($m) => (string) ($vars[$m[1]] ?? ''), $template);
}
