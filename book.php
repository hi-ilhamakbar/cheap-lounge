<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require APP_ROOT . '/templates/layout.php';

$lounge = isset($_GET['lounge']) ? get_active_lounge((string) $_GET['lounge']) : null;
$initial = $lounge ? [
    'airport' => $lounge['airport'],
    'lounge' => array_intersect_key($lounge, array_flip(['id', 'name', 'terminal', 'openingHours', 'airportIata'])),
] : null;
$steps = t('booking.steps');

page_start(t('booking.title'), ['noindex' => true, 'scripts' => ['assets/js/booking.js']]);
?>
<div class="container-page py-10 sm:py-14">
  <h1 class="heading-display text-3xl sm:text-4xl"><?= e(t('booking.title')) ?></h1>
  <noscript><div class="mt-6"><?= notice('JavaScript is required to place an order. · JavaScript diperlukan untuk memesan.', 'error') ?></div></noscript>

  <div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]" id="booking" data-initial="<?= e(json_encode($initial, JSON_UNESCAPED_UNICODE)) ?>">
    <div class="min-w-0">
      <nav aria-label="Progress" class="mb-8">
        <p class="mb-3 text-sm text-slate-500" data-step-of></p>
        <ol class="grid grid-cols-5 gap-2">
          <?php foreach ($steps as $i => $label): ?>
          <li data-progress="<?= $i ?>"><div class="h-1.5 rounded-full bg-navy-100 transition-colors" data-bar></div><span class="mt-2 hidden text-xs font-medium text-slate-400 sm:block" data-label><?= e($label) ?></span></li>
          <?php endforeach ?>
        </ol>
      </nav>

      <div class="card p-5 sm:p-8">
        <div class="mb-6 hidden" data-form-error></div>

        <!-- STEP 0: airport & lounge -->
        <section data-step="0" class="space-y-6">
          <h2 class="text-xl font-semibold"><?= e($steps[0]) ?></h2>
          <div>
            <span class="field-label"><?= e(t('booking.airport')) ?></span>
            <p class="mb-3 hidden rounded-xl bg-navy-50 px-4 py-3 text-sm" data-airport-display></p>
            <?= airport_search('md', 'select') ?>
            <p class="field-error hidden" data-error="airportIata"></p>
          </div>
          <div>
            <span class="field-label"><?= e(t('booking.lounge')) ?></span>
            <div data-lounge-area></div>
            <p class="field-error hidden" data-error="loungeId"></p>
          </div>
          <p class="text-xs text-slate-500"><?= e(t('lounge.disclaimer')) ?></p>
        </section>

        <!-- STEP 1: date -->
        <section data-step="1" class="hidden space-y-5">
          <h2 class="text-xl font-semibold"><?= e($steps[1]) ?></h2>
          <div>
            <label for="visitDate" class="field-label"><?= e(t('booking.visitDate')) ?></label>
            <input id="visitDate" type="date" class="field-input max-w-xs" data-field="visitDate">
            <p class="field-hint"><?= e(t('booking.dateHint')) ?></p>
            <p class="mt-2 text-sm font-medium text-navy-800" data-date-preview></p>
            <p class="field-error hidden" data-error="visitDate"></p>
          </div>
        </section>

        <!-- STEP 2: contact -->
        <section data-step="2" class="hidden space-y-5">
          <h2 class="text-xl font-semibold"><?= e($steps[2]) ?></h2>
          <div>
            <label for="whatsapp" class="field-label"><?= e(t('booking.whatsapp')) ?> *</label>
            <input id="whatsapp" type="tel" inputmode="tel" autocomplete="tel" class="field-input" value="+62 " placeholder="+62 812 3456 7890" data-field="whatsapp">
            <p class="field-hint"><?= e(t('booking.whatsappHint')) ?></p>
            <p class="field-error hidden" data-error="whatsapp"></p>
          </div>
          <div>
            <label for="email" class="field-label"><?= e(t('booking.email')) ?> *</label>
            <input id="email" type="email" inputmode="email" autocomplete="email" class="field-input" placeholder="nama@email.com" data-field="email">
            <p class="field-hint"><?= e(t('booking.emailHint')) ?></p>
            <p class="field-error hidden" data-error="email"></p>
          </div>
          <div>
            <label for="customerName" class="field-label"><?= e(t('booking.customerName')) ?></label>
            <input id="customerName" type="text" autocomplete="name" maxlength="100" class="field-input" data-field="customerName">
          </div>
        </section>

        <!-- STEP 3: passengers -->
        <section data-step="3" class="hidden space-y-6">
          <h2 class="text-xl font-semibold"><?= e($steps[3]) ?></h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <?php foreach (['adult' => [t('booking.adults'), t('booking.adultsHint')], 'child' => [t('booking.children'), t('booking.childrenHint')]] as $kind => [$label, $hint]): ?>
            <div class="flex items-center justify-between rounded-2xl border border-navy-100 p-4" data-qty="<?= $kind ?>">
              <div><p class="font-semibold"><?= e($label) ?></p><p class="text-xs text-slate-500"><?= e($hint) ?></p></div>
              <div class="flex items-center gap-3">
                <button type="button" aria-label="<?= e($label) ?> −" class="grid size-9 place-items-center rounded-full border border-navy-100 text-lg disabled:opacity-40" data-dec>−</button>
                <span class="w-6 text-center text-lg font-semibold tabular-nums" aria-live="polite" data-val></span>
                <button type="button" aria-label="<?= e($label) ?> +" class="grid size-9 place-items-center rounded-full border border-navy-100 text-lg disabled:opacity-40" data-inc>+</button>
              </div>
            </div>
            <?php endforeach ?>
          </div>
          <p class="field-error hidden" data-error="adultQty"></p>
          <?= notice(e(t('booking.nameInstruction'))) ?>
          <fieldset class="space-y-3" data-names-wrap="adult">
            <legend class="mb-1 text-xs font-bold tracking-[0.14em] text-navy-900"><?= e(t('booking.adultSection')) ?></legend>
            <div class="space-y-3" data-names="adult"></div>
          </fieldset>
          <fieldset class="space-y-3 rounded-2xl bg-navy-50/70 p-4" data-names-wrap="child">
            <legend class="mb-1 px-1 text-xs font-bold tracking-[0.14em] text-accent-700"><?= e(t('booking.childSection')) ?></legend>
            <p class="text-xs text-slate-600"><?= e(t('booking.childrenHint')) ?></p>
            <div class="space-y-3" data-names="child"></div>
          </fieldset>
          <?= single_entry_notice(true) ?>
        </section>

        <!-- STEP 4: review -->
        <section data-step="4" class="hidden space-y-6">
          <h2 class="text-xl font-semibold"><?= e(t('booking.summary')) ?></h2>
          <div class="space-y-4" data-summary></div>
          <div class="rounded-2xl bg-navy-900 p-5 text-white">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-navy-100"><?= e(t('booking.priceBreakdown')) ?></p>
            <dl class="mt-4 space-y-2 text-sm" data-price="dark"></dl>
          </div>
          <?= single_entry_notice() ?>
          <label class="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" class="mt-0.5 size-5 shrink-0 accent-navy-900" data-field="acceptTerms">
            <span><?= e(t('booking.terms')) ?> <a href="<?= e(url('terms.php')) ?>" target="_blank" class="font-semibold underline"><?= e(t('booking.termsLink')) ?></a><?= e(t('booking.termsTail')) ?></span>
          </label>
          <p class="field-error hidden" data-error="acceptTerms"></p>
        </section>

        <div class="mt-8 flex items-center justify-between gap-3 border-t border-navy-100 pt-6">
          <button type="button" class="btn-ghost invisible" data-back><?= icon('left', 'size-4') ?> <?= e(t('booking.back')) ?></button>
          <button type="button" class="btn-navy" data-next><?= e(t('booking.next')) ?> <?= icon('right', 'size-4') ?></button>
          <button type="button" class="btn-primary hidden" data-submit disabled><?= e(t('booking.submit')) ?></button>
        </div>
      </div>
    </div>

    <aside class="lg:sticky lg:top-24 lg:self-start">
      <div class="card p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-accent-600"><?= e(t('booking.summary')) ?></p>
        <p class="mt-3 font-semibold" data-side-lounge>—</p>
        <p class="text-sm text-slate-500" data-side-airport>—</p>
        <p class="mt-2 hidden text-sm text-slate-600" data-side-date></p>
        <dl class="mt-4 space-y-2 text-sm" data-price="light"></dl>
        <p class="mt-4 text-xs text-slate-500"><?= e(t('singleEntry.short')) ?></p>
      </div>
    </aside>
  </div>
</div>
<?php page_end();
