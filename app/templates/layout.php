<?php
declare(strict_types=1);

require_once __DIR__ . '/icons.php';
require_once __DIR__ . '/components.php';

function page_start(string $title = '', array $opts = []): void
{
    $lang = current_lang();
    $full = $title ? "$title | JASA TIKET MURAH" : t('meta.title');
    $robots = !empty($opts['noindex']) ? '<meta name="robots" content="noindex, nofollow">' : '';
    $referrer = !empty($opts['noReferrer']) ? '<meta name="referrer" content="no-referrer">' : '';
    // Client-side strings for app.js / booking.js
    $js = ['errors' => t('errors'), 'search' => t('search'), 'lounge' => t('lounge'), 'booking' => t('booking'), 'order' => t('order'), 'status' => t('status'), 'singleEntry' => t('singleEntry')];
    ?>
<!doctype html>
<html lang="<?= e($lang) ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($full) ?></title>
<meta name="description" content="<?= e(t('meta.description')) ?>">
<meta name="theme-color" content="#0f1b3d">
<?= $robots . $referrer ?>
<meta property="og:title" content="<?= e(t('meta.title')) ?>">
<meta property="og:description" content="<?= e(t('meta.description')) ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= e(asset('assets/css/app.css')) ?>">
<link rel="icon" href="<?= e(url('assets/img/favicon.svg')) ?>" type="image/svg+xml">
<script>window.I18N=<?= json_encode($js, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?>;window.LANG=<?= json_encode($lang) ?>;window.BASE=<?= json_encode(rtrim(url(''), '/')) ?>;</script>
<script src="<?= e(asset('assets/js/app.js')) ?>" defer></script>
<?php foreach ($opts['scripts'] ?? [] as $s): ?><script src="<?= e(asset($s)) ?>" defer></script>
<?php endforeach ?>
</head>
<body class="flex min-h-dvh flex-col">
<?php render_header(); ?>
<main class="flex-1">
<?php
}

function page_end(): void
{
    echo "</main>\n";
    render_footer();
    $wa = whatsapp_link(t('support.waMessage'));
    echo '<a href="' . e($wa) . '" target="_blank" rel="noopener noreferrer" aria-label="' . e(t('support.floatingLabel')) . '" data-wa-float class="group fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-[#1fa855] p-3.5 text-white shadow-lift transition hover:bg-[#178c46] sm:bottom-6 sm:right-6">'
        . icon('whatsapp', 'size-6') . '<span class="hidden pr-1 text-sm font-semibold lg:inline">' . e(t('support.floatingLabel')) . '</span></a>';
    echo "\n</body>\n</html>\n";
}

function logo(bool $light = false): string
{
    return '<a href="' . e(url('')) . '" class="group inline-flex items-center gap-2.5" aria-label="JASA TIKET MURAH — home">'
        . '<span class="grid size-9 place-items-center rounded-xl ' . ($light ? 'bg-white text-navy-900' : 'bg-navy-900 text-white') . ' shadow-sm">'
        . '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 18h16M6 18V9a6 6 0 0 1 12 0v9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="9" r="1.6" fill="#d62f37"/></svg></span>'
        . '<span class="leading-none"><span class="block text-[13px] font-extrabold tracking-[0.08em] ' . ($light ? 'text-white' : 'text-navy-900') . '">JASA TIKET MURAH</span>'
        . '<span class="block pt-1 text-[11px] font-medium tracking-wide ' . ($light ? 'text-navy-100' : 'text-slate-500') . '">Airport Lounge Voucher</span></span></a>';
}

function lang_switch_url(string $lang): string
{
    $params = $_GET;
    $params['lang'] = $lang;
    return strtok((string) ($_SERVER['REQUEST_URI'] ?? '/'), '?') . '?' . http_build_query($params);
}

function render_header(): void
{
    $lang = current_lang();
    $links = [['#how', t('nav.howItWorks')], ['#pricing', t('nav.pricing')], ['#faq', t('nav.faq')], ['#support', t('nav.contact')]];
    echo '<header class="sticky top-0 z-40 border-b border-navy-100/70 bg-white/85 backdrop-blur-md"><div class="container-page flex h-16 items-center justify-between gap-4">' . logo();
    echo '<nav aria-label="Main" class="hidden items-center gap-7 md:flex">';
    foreach ($links as [$h, $l]) echo '<a href="' . e(url('') . $h) . '" class="text-sm font-medium text-navy-700 transition hover:text-navy-900">' . e($l) . '</a>';
    echo '</nav><div class="flex items-center gap-2 sm:gap-3"><div role="group" aria-label="' . e(t('nav.language')) . '" class="inline-flex rounded-full border border-navy-100 bg-navy-50 p-0.5">';
    foreach (['id' => ['ID', 'Bahasa Indonesia'], 'en' => ['EN', 'English']] as $code => [$short, $full]) {
        $active = $code === $lang;
        echo '<a href="' . e(lang_switch_url($code)) . '" hreflang="' . $code . '" title="' . e($full) . '" aria-current="' . ($active ? 'true' : 'false') . '" class="rounded-full px-3 py-1.5 text-xs font-semibold transition '
            . ($active ? 'bg-navy-900 text-white shadow-sm' : 'text-navy-700 hover:text-navy-900') . '">' . $short . '</a>';
    }
    echo '</div><a href="' . e(url('') . '#search') . '" class="btn-primary hidden px-4 py-2.5 sm:inline-flex">' . e(t('nav.book')) . '</a></div></div></header>';
}

function render_footer(): void
{
    $year = date('Y');
    $wa = whatsapp_link(t('support.waMessage'));
    $li = fn ($href, $label) => '<li><a class="hover:text-white" href="' . e($href) . '">' . e($label) . '</a></li>';
    echo '<footer class="mt-24 bg-navy-950 text-navy-100"><div class="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">'
        . '<div class="space-y-4">' . logo(true) . '<p class="max-w-sm text-sm leading-relaxed text-slate-300">' . e(t('footer.tagline')) . '</p><p class="text-xs text-slate-400">QRIS NMID ' . QRIS_NMID . '</p></div>'
        . '<div><h2 class="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-white">' . e(t('footer.links')) . '</h2><ul class="space-y-2.5 text-sm">'
        . $li(url('') . '#how', t('nav.howItWorks')) . $li(url('') . '#pricing', t('nav.pricing')) . $li(url('') . '#faq', t('nav.faq'))
        . $li(url('track.php'), t('footer.trackOrder')) . $li(url('terms.php'), t('footer.terms')) . $li(url('privacy.php'), t('footer.privacy')) . '</ul></div>'
        . '<div><h2 class="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-white">' . e(t('footer.contact')) . '</h2><ul class="space-y-2.5 text-sm">'
        . '<li><a class="hover:text-white" href="' . e($wa) . '" target="_blank" rel="noopener noreferrer">WhatsApp ' . WHATSAPP_DISPLAY . '</a></li>';
    // With internal_copy = 'bcc' the internal Gmail addresses stay private (not shown on the site either).
    if (internal_copy_mode() === 'cc') foreach (INTERNAL_CC_EMAILS as $m) echo '<li><a class="break-all hover:text-white" href="mailto:' . e($m) . '">' . e($m) . '</a></li>';
    echo '</ul></div></div><div class="border-t border-white/10"><div class="container-page flex flex-col gap-2 py-6 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">'
        . '<p>© ' . $year . ' JASA TIKET MURAH. ' . e(t('footer.rights')) . '</p><p class="max-w-xl md:text-right">' . e(t('footer.disclaimer')) . '</p></div></div></footer>';
}
