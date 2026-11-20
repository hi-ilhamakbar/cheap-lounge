<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require APP_ROOT . '/templates/layout.php';
require APP_ROOT . '/templates/dummy.php';

$lang = current_lang();
$p100 = format_idr(TICKET_PRICE_PER_ROUTE_IDR, $lang);
$p200 = format_idr(2 * TICKET_PRICE_PER_ROUTE_IDR, $lang);
page_start(t('ticket.service'), ['scripts' => ['assets/js/dummy.js']]);
echo dummy_hero('ticket', 'plane', [
    [t('ticket.priceOneWay'), $p100, t('form.perPerson')],
    [t('ticket.priceRoundTrip'), $p200, t('form.perPerson')],
    [t('ticket.priceMulti'), $p100, t('ticket.perRoute')],
], 'from-[#1d3b8f] via-navy-900 to-navy-950');

$trip = '<div role="radiogroup" aria-label="' . e(t('ticket.tripType')) . '" class="grid gap-3 sm:grid-cols-3">';
foreach (['oneway' => t('ticket.oneWay'), 'roundtrip' => t('ticket.roundTrip'), 'multicity' => t('ticket.multiCity')] as $v => $l) {
    $trip .= '<label class="relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-navy-100 p-4 transition has-[:checked]:border-navy-900 has-[:checked]:bg-navy-50">'
        . '<input type="radio" name="tripType" value="' . $v . '" class="size-4 accent-navy-900" data-f="tripType"' . ($v === 'oneway' ? ' checked' : '') . '><span class="font-semibold">' . e($l) . '</span></label>';
}
$trip .= '</div><p class="field-error hidden" data-error="tripType"></p>'
    . '<div class="mt-5 space-y-4" data-routes></div><p class="field-error hidden" data-error="routes"></p>'
    . '<button type="button" class="btn-ghost mt-4 hidden px-4 py-2" data-add-route>' . e(t('ticket.addRoute')) . '</button>'
    . '<p class="field-hint" data-route-hint>' . e(t('ticket.dateHint')) . '</p>';

$prefs = '<div class="grid gap-5 sm:grid-cols-2">'
    . text_field('f-airline', t('ticket.airline'), 'type="text" maxlength="80" placeholder="Garuda Indonesia, Singapore Airlines…" data-f="airline"', t('ticket.airlineHint'), false)
    . '<div><label for="f-usageDate" class="field-label">' . e(t('ticket.usageDate')) . ' *</label><input id="f-usageDate" type="date" class="field-input" data-f="usageDate" data-window="300">'
    . '<p class="field-error hidden" data-error="usageDate"></p></div></div>'
    . '<div class="mt-4">' . notice('<strong>' . e(t('ticket.usageDate')) . ':</strong> ' . e(t('ticket.usageHint'))) . '</div>';

$pax = '<div class="grid gap-4 sm:grid-cols-3">'
    . count_select('adults', t('form.adults'), t('form.adultsHint'), 1)
    . count_select('children', t('form.children'), t('form.childrenHint'), 0)
    . count_select('infants', t('form.infants'), t('form.infantsHint'), 0)
    . '</div><div class="mt-5">' . notice(e(t('form.nameAsPassport'))) . '</div>'
    . '<div class="mt-5 space-y-4" data-people="passengers"></div>';
?>
<div class="container-page py-10 sm:py-14">
  <form class="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]" data-dummy="ticket" novalidate>
    <div class="min-w-0 space-y-6">
      <?= form_section(1, t('ticket.sectionTrip'), $trip) ?>
      <?= form_section(2, t('ticket.sectionPrefs'), $prefs) ?>
      <?= form_section(3, t('ticket.sectionPax'), $pax) ?>
      <?= form_section(4, t('form.contactTitle'), contact_fields()) ?>
    </div>
    <?= summary_aside() ?>
  </form>
</div>
<?php page_end();
