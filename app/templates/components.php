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

function unavailable(): string
{
    return '<span class="italic text-slate-400">' . e(t('lounge.infoUnavailable')) . '</span>';
}

function value_or_unavailable(?string $v, bool $multiline = false): string
{
    if ($v === null || $v === '') return unavailable();
    return $multiline ? nl2br(e($v)) : e($v);
}

function lounge_card(array $l): string
{
    $img = $l['images'][0] ?? null;
    $media = $img
        ? '<img src="' . e($img) . '" alt="' . e($l['name']) . '" loading="lazy" class="h-full w-full object-cover" referrerpolicy="no-referrer">'
        : '<div class="flex h-full items-center justify-center text-center text-xs uppercase tracking-[0.2em] text-navy-100/70">' . e($l['airportIata']) . ' · Lounge</div>';
    $term = $l['terminal'] ? '<span class="badge absolute left-3 top-3 bg-white/95 text-navy-900 shadow-sm">' . e(t('lounge.terminal')) . ' ' . e($l['terminal']) . '</span>' : '';
    $fac = '';
    if ($l['facilities']) {
        $fac = '<ul class="mt-4 flex flex-wrap gap-1.5">';
        foreach (array_slice($l['facilities'], 0, 5) as $f) $fac .= '<li class="badge bg-navy-50 text-navy-700">' . icon('check', 'size-3') . ' ' . e($f) . '</li>';
        if (count($l['facilities']) > 5) $fac .= '<li class="badge bg-navy-50 text-navy-700">+' . (count($l['facilities']) - 5) . '</li>';
        $fac .= '</ul>';
    }
    $id = rawurlencode($l['id']);
    return '<article class="card flex flex-col overflow-hidden transition hover:shadow-lift">'
        . '<div class="relative aspect-[16/9] bg-gradient-to-br from-navy-800 to-navy-950">' . $media . $term . '</div>'
        . '<div class="flex flex-1 flex-col p-5"><h3 class="text-lg font-semibold text-navy-900">' . e($l['name']) . '</h3>'
        . '<dl class="mt-3 space-y-2 text-sm text-slate-600">'
        . '<div class="flex gap-2"><dt class="sr-only">' . e(t('lounge.location')) . '</dt>' . icon('pin', 'mt-0.5 size-4 shrink-0 text-navy-700') . '<dd class="line-clamp-2">' . value_or_unavailable($l['location']) . '</dd></div>'
        . '<div class="flex gap-2"><dt class="sr-only">' . e(t('lounge.hours')) . '</dt>' . icon('clock', 'mt-0.5 size-4 shrink-0 text-navy-700') . '<dd class="line-clamp-2">' . value_or_unavailable($l['openingHours'], true) . '</dd></div>'
        . '</dl>' . $fac
        . '<div class="mt-auto flex gap-2 pt-5"><a href="' . e(url("lounge.php?id=$id")) . '" class="btn-ghost flex-1 px-3">' . e(t('lounge.details')) . '</a>'
        . '<a href="' . e(url("book.php?lounge=$id")) . '" class="btn-primary flex-1 px-3">' . e(t('lounge.select')) . ' ' . icon('right', 'size-4') . '</a></div>'
        . '</div></article>';
}

/** Airport autocomplete (enhanced by assets/js/app.js). Works without JS: submits to airport.php. */
function airport_search(string $size = 'lg', string $mode = 'navigate'): string
{
    $lg = $size === 'lg';
    $id = 'as-' . bin2hex(random_bytes(3));
    return '<div class="relative w-full" data-airport-search data-mode="' . e($mode) . '">'
        . '<form role="search" action="' . e(url('airport.php')) . '" method="get" class="flex w-full items-center gap-2 rounded-2xl border border-navy-100 bg-white shadow-lift ' . ($lg ? 'p-2 sm:p-2.5' : 'p-1.5') . '">'
        . '<label for="' . $id . '" class="sr-only">' . e(t('search.label')) . '</label>'
        . '<span class="pl-3 text-navy-700" data-search-icon>' . icon('search') . '</span>'
        . '<input id="' . $id . '" name="q" type="text" role="combobox" aria-expanded="false" aria-controls="' . $id . '-list" aria-autocomplete="list" autocomplete="off" placeholder="' . e(t('search.placeholder')) . '" class="min-w-0 flex-1 bg-transparent text-navy-900 placeholder:text-slate-400 focus:outline-none ' . ($lg ? 'py-3 text-base' : 'py-2 text-sm') . '">'
        . '<button type="submit" class="btn-primary shrink-0 ' . ($lg ? 'px-5 py-3 sm:px-6' : 'px-4 py-2') . '"><span class="hidden sm:inline">' . e(t('search.button')) . '</span>' . icon('search', 'size-4 sm:hidden') . '</button>'
        . '</form><div class="absolute inset-x-0 top-full z-30 mt-2 hidden overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-lift" data-search-panel><ul id="' . $id . '-list" role="listbox" class="max-h-80 overflow-auto py-1"></ul><p class="hidden px-4 py-4 text-sm" data-search-msg></p></div></div>';
}
