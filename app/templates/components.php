<?php
declare(strict_types=1);

function notice(string $html, string $tone = 'info'): string
{
    $styles = [
        'info' => 'border-navy-100 bg-navy-50 text-navy-800',
        'warn' => 'border-amber-200 bg-amber-50 text-amber-900',
        'error' => 'border-accent-600/25 bg-accent-50 text-accent-700',
    ][$tone];
    $role = $tone === 'error' ? 'alert' : 'status';
    return '<div role="' . $role . '" class="flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ' . $styles . '">'
        . icon($tone === 'info' ? 'info' : 'alert', 'mt-0.5 size-4 shrink-0') . '<div class="space-y-2">' . $html . '</div></div>';
}

/** Mandatory "single entry only" notice (home, pricing, booking form, payment page). */
function single_entry_notice(bool $compact = false): string
{
    if ($compact) {
        return '<p class="flex items-start gap-2 rounded-xl border border-accent-600/20 bg-accent-50 px-3.5 py-2.5 text-sm text-accent-700">'
            . icon('ticket', 'mt-0.5 size-4 shrink-0') . '<span><strong class="font-semibold">' . e(t('singleEntry.title')) . '.</strong> ' . e(t('singleEntry.short')) . '</span></p>';
    }
    $items = '';
    foreach (t('singleEntry.bullets') as $b) $items .= '<li class="flex gap-2"><span class="mt-2 size-1.5 shrink-0 rounded-full bg-accent-600"></span>' . e($b) . '</li>';
    return '<div class="rounded-2xl border border-accent-600/20 bg-accent-50 p-5 sm:p-6"><div class="flex items-center gap-2.5 text-accent-700">'
        . icon('ticket') . '<h3 class="text-sm font-bold uppercase tracking-wide">' . e(t('singleEntry.title')) . '</h3></div>'
        . '<ul class="mt-3 grid gap-1.5 text-sm text-navy-800 sm:grid-cols-2">' . $items . '</ul></div>';
}

function status_badge(string $status): string
{
    $styles = [
        'PENDING_PAYMENT' => 'bg-amber-50 text-amber-800 ring-amber-200',
        'PAYMENT_SUBMITTED' => 'bg-sky-50 text-sky-800 ring-sky-200',
    ];
    return '<span class="badge ring-1 ' . ($styles[$status] ?? 'bg-slate-100 text-slate-700 ring-slate-200') . '" data-status-badge>' . e(t("status.$status")) . '</span>';
}

/**
 * Free-text search box: the customer writes the airport / lounge they want (no suggestions).
 * "Cari Lounge" opens the booking page with the text pre-filled; our team confirms availability.
 */
function lounge_search(string $size = 'lg'): string
{
    $lg = $size === 'lg';
    $id = 'ls-' . bin2hex(random_bytes(3));
    return '<form role="search" action="' . e(url('book.php')) . '" method="get" class="flex w-full items-center gap-2 rounded-2xl border border-navy-100 bg-white shadow-lift ' . ($lg ? 'p-2 sm:p-2.5' : 'p-1.5') . '" data-lounge-search>'
        . '<label for="' . $id . '" class="sr-only">' . e(t('search.label')) . '</label>'
        . '<span class="pl-3 text-navy-700">' . icon('search') . '</span>'
        . '<input id="' . $id . '" name="q" type="text" required minlength="2" maxlength="120" autocomplete="off" data-required-msg="' . e(t('search.required')) . '" placeholder="' . e(t('search.placeholder')) . '" class="min-w-0 flex-1 bg-transparent text-navy-900 placeholder:text-slate-400 focus:outline-none ' . ($lg ? 'py-3 text-base' : 'py-2 text-sm') . '">'
        . '<button type="submit" class="btn-primary shrink-0 ' . ($lg ? 'px-5 py-3 sm:px-6' : 'px-4 py-2') . '"><span class="hidden sm:inline">' . e(t('search.button')) . '</span>' . icon('search', 'size-4 sm:hidden') . '</button>'
        . '</form>';
}

/** Big, hard-to-miss notice: lounge vouchers are delivered by the departure day at the latest. */
function voucher_timing_notice(): string
{
    return '<div role="alert" class="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 sm:p-6">'
        . '<div class="flex items-start gap-3">' . icon('alert', 'mt-0.5 size-6 shrink-0 text-amber-600')
        . '<div><p class="text-base font-extrabold leading-snug text-amber-900 sm:text-lg">' . e(t('voucherTiming.title')) . '</p>'
        . '<p class="mt-2 text-sm leading-relaxed text-amber-900/90">' . e(t('voucherTiming.body')) . '</p></div></div></div>';
}

function lounge_finder_note(bool $light = false): string
{
    return '<p class="mt-3 flex items-start gap-2 text-sm ' . ($light ? 'text-slate-300' : 'text-slate-600') . '">' . icon('info', 'mt-0.5 size-4 shrink-0 text-navy-700') . '<span>'
        . e(t('loungeFinder.text')) . ' <a href="https://loungefinder.loungekey.com" target="_blank" rel="noopener noreferrer" class="font-semibold text-navy-900 underline decoration-accent-600 underline-offset-2">' . e(t('loungeFinder.link')) . '</a>.</span></p>';
}

/** Small label + select 0–9 (used by dummy ticket / hotel forms). */
function count_select(string $name, string $label, string $hint, int $default, int $min = 0, int $max = 9): string
{
    $opts = '';
    for ($i = $min; $i <= $max; $i++) $opts .= '<option value="' . $i . '"' . ($i === $default ? ' selected' : '') . '>' . $i . '</option>';
    return '<div><label for="f-' . e($name) . '" class="field-label">' . e($label) . '</label>'
        . '<select id="f-' . e($name) . '" name="' . e($name) . '" class="field-input" data-count="' . e($name) . '">' . $opts . '</select>'
        . ($hint !== '' ? '<p class="field-hint">' . e($hint) . '</p>' : '') . '<p class="field-error hidden" data-error="' . e($name) . '"></p></div>';
}
