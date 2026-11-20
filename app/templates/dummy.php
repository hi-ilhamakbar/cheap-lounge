<?php
declare(strict_types=1);

/** Shared building blocks for the Dummy Ticket and Dummy Hotel pages. */

function dummy_hero(string $key, string $iconName, array $priceTiles, string $accent): string
{
    $tiles = '';
    foreach ($priceTiles as [$label, $price, $unit]) {
        $tiles .= '<div class="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"><p class="text-xs uppercase tracking-[0.14em] text-navy-100">' . e($label) . '</p>'
            . '<p class="mt-1 text-xl font-bold text-white sm:text-2xl">' . e($price) . '</p>'
            . ($unit !== '' ? '<p class="text-xs font-medium text-navy-100">' . e($unit) . '</p>' : '') . '</div>';
    }
    $rules = '';
    foreach (t("$key.rules") as $r) $rules .= '<li class="flex gap-2.5">' . icon('check', 'mt-0.5 size-4 shrink-0 text-gold-500') . '<span>' . e($r) . '</span></li>';
    return '<section class="relative overflow-hidden bg-gradient-to-br ' . $accent . ' text-white">'
        . '<div aria-hidden="true" class="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(201,164,92,.28),transparent_45%)]"></div>'
        . '<div aria-hidden="true" class="absolute -right-24 -top-24 size-96 rounded-full border border-white/10"></div>'
        . '<div class="container-page relative grid gap-10 py-14 sm:py-16 lg:grid-cols-[1.2fr_1fr] lg:items-end">'
        . '<div><span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ring-white/20">' . icon($iconName, 'size-4') . e(t("$key.eyebrow")) . '</span>'
        . '<h1 class="mt-5 font-display text-4xl font-semibold leading-tight sm:text-5xl">' . e(t("$key.title")) . '</h1>'
        . '<p class="mt-4 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">' . e(t("$key.subtitle")) . '</p>'
        . '<div class="mt-7 grid gap-3 sm:grid-cols-' . count($priceTiles) . '">' . $tiles . '</div></div>'
        . '<div class="rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur"><p class="text-xs font-semibold uppercase tracking-[0.16em] text-gold-500">' . e(t('form.rulesTitle')) . '</p>'
        . '<ul class="mt-4 space-y-3 text-sm leading-relaxed text-slate-100">' . $rules . '</ul></div>'
        . '</div></section>';
}

function form_section(int $n, string $title, string $body): string
{
    return '<section class="card p-5 sm:p-7"><h2 class="flex items-center gap-3 text-lg font-semibold"><span class="grid size-8 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">' . $n . '</span>' . e($title) . '</h2><div class="mt-5">' . $body . '</div></section>';
}

function text_field(string $id, string $label, string $attrs = '', string $hint = '', bool $required = true): string
{
    return '<div><label for="' . e($id) . '" class="field-label">' . e($label) . ($required ? ' *' : ' <span class="font-normal text-slate-400">(' . e(t('form.optional')) . ')</span>') . '</label>'
        . '<input id="' . e($id) . '" class="field-input" ' . $attrs . '>' . ($hint ? '<p class="field-hint">' . e($hint) . '</p>' : '')
        . '<p class="field-error hidden" data-error="' . e(preg_replace('/^f-/', '', $id)) . '"></p></div>';
}

function contact_fields(): string
{
    return '<div class="grid gap-5 sm:grid-cols-2">'
        . text_field('f-whatsapp', t('booking.whatsapp'), 'type="tel" inputmode="tel" autocomplete="tel" value="+62 " placeholder="+62 812 3456 7890" data-f="whatsapp"', t('booking.whatsappHint'))
        . text_field('f-email', t('booking.email'), 'type="email" inputmode="email" autocomplete="email" placeholder="nama@email.com" data-f="email"', t('booking.emailHint'))
        . '</div><div class="mt-5">' . text_field('f-customerName', t('booking.customerName'), 'type="text" autocomplete="name" maxlength="100" data-f="customerName"', '', false) . '</div>';
}

function summary_aside(): string
{
    return '<aside class="lg:sticky lg:top-24 lg:self-start"><div class="card overflow-hidden">'
        . '<div class="bg-navy-900 px-5 py-4 text-white"><p class="text-xs font-semibold uppercase tracking-[0.16em] text-navy-100">' . e(t('form.summary')) . '</p>'
        . '<p class="mt-1 text-3xl font-bold tabular-nums" data-total>—</p></div>'
        . '<div class="space-y-4 p-5"><dl class="space-y-2 text-sm" data-lines></dl>'
        . '<div class="hidden" data-form-error></div>'
        . '<label class="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" class="mt-0.5 size-5 shrink-0 accent-navy-900" data-f="acceptTerms">'
        . '<span>' . e(t('form.terms')) . ' <a href="' . e(url('terms.php')) . '" target="_blank" class="font-semibold underline">' . e(t('form.termsLink')) . '</a>.</span></label>'
        . '<p class="field-error hidden" data-error="acceptTerms"></p>'
        . '<button type="submit" class="btn-primary w-full" data-submit>' . e(t('form.submit')) . '</button>'
        . '<p class="flex items-center gap-2 text-xs text-slate-500">' . icon('qr', 'size-4') . 'QRIS · ' . e(QRIS_MERCHANT) . '</p>'
        . '</div></div></aside>';
}
