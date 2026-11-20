<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require APP_ROOT . '/templates/layout.php';
require APP_ROOT . '/templates/dummy.php';

$lang = current_lang();
page_start(t('hotel.service'), ['scripts' => ['assets/js/dummy.js']]);
echo dummy_hero('hotel', 'hotel', [
    [t('form.adults') . ' & ' . t('form.children'), format_idr(HOTEL_PRICE_PER_GUEST_IDR, $lang), t('hotel.priceUnit')],
    [t('form.infants'), t('form.free'), ''],
], 'from-[#7a1d2a] via-navy-900 to-navy-950');

$guests = '<div class="grid gap-4 sm:grid-cols-4">'
    . count_select('rooms', t('hotel.rooms'), '', 1, 1)
    . count_select('adults', t('form.adults'), t('form.adultsHint'), 1)
    . count_select('children', t('form.children'), t('form.childrenHint'), 0)
    . count_select('infants', t('form.infants'), t('form.infantsHint'), 0)
    . '</div><div class="mt-4">' . notice(e(t('hotel.roomRule'))) . '</div>';

$stays = '<div class="space-y-4" data-stays></div><p class="field-error hidden" data-error="stays"></p>'
    . '<button type="button" class="btn-ghost mt-4 px-4 py-2" data-add-stay>' . e(t('hotel.addStay')) . '</button>'
    . '<p class="field-hint">' . e(t('hotel.dateHint')) . '</p>';

$names = notice(e(t('form.nameAsPassport'))) . '<div class="mt-5 space-y-3" data-people="guests"></div>';
?>
<div class="container-page py-10 sm:py-14">
  <form class="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]" data-dummy="hotel" novalidate>
    <div class="min-w-0 space-y-6">
      <?= form_section(1, t('hotel.sectionGuests'), $guests) ?>
      <?= form_section(2, t('hotel.sectionStays'), $stays) ?>
      <?= form_section(3, t('hotel.sectionGuestNames'), $names) ?>
      <?= form_section(4, t('form.contactTitle'), contact_fields()) ?>
    </div>
    <?= summary_aside() ?>
  </form>
</div>
<?php page_end();
