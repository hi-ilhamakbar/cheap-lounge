<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require APP_ROOT . '/templates/layout.php';

$lang = current_lang();
$popular = [
    ['CGK', 'Jakarta', 'Soekarno-Hatta'], ['DPS', 'Bali', 'I Gusti Ngurah Rai'], ['SIN', 'Singapore', 'Changi'], ['KUL', 'Kuala Lumpur', 'KLIA'],
    ['BKK', 'Bangkok', 'Suvarnabhumi'], ['HKG', 'Hong Kong', 'Hong Kong Intl.'], ['NRT', 'Tokyo', 'Narita'], ['DXB', 'Dubai', 'Dubai Intl.'],
];
$stepIcons = ['search', 'plane', 'users', 'qr'];
$whyIcons = ['shield', 'qr', 'mail', 'chat'];

page_start(t('meta.loungeTitle'));
?>
<section id="search" class="relative scroll-mt-20 overflow-hidden">
  <div aria-hidden="true" class="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_80%_-10%,#e6eaf4_0%,transparent_60%),radial-gradient(40rem_20rem_at_0%_110%,#fdf1f2_0%,transparent_60%)]"></div>
  <div class="container-page relative grid items-center gap-12 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-28">
    <div>
      <span class="badge border border-navy-100 bg-white text-navy-700 shadow-sm"><span class="size-1.5 rounded-full bg-accent-600"></span> <?= e(t('hero.badge')) ?></span>
      <h1 class="heading-display mt-6 text-4xl leading-[1.08] sm:text-5xl lg:text-[3.6rem]"><?= e(t('hero.title')) ?></h1>
      <p class="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg"><?= e(t('hero.subtitle')) ?></p>
      <div class="mt-8 max-w-xl"><?= lounge_search('lg') ?><?= lounge_finder_note() ?></div>
      <p class="mt-4 text-sm text-slate-500"><?= e(t('hero.fromPrice')) ?> <strong class="text-navy-900"><?= e(format_idr(PRICE_CHILD_IDR, $lang)) ?></strong> <?= e(t('hero.perPerson')) ?> · <?= e(t('singleEntry.short')) ?></p>
    </div>
    <div aria-hidden="true" class="relative hidden lg:block">
      <div class="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-navy-800 via-navy-900 to-navy-950 shadow-lift">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(201,164,92,.35),transparent_45%)]"></div>
        <svg viewBox="0 0 400 500" class="absolute inset-0 h-full w-full">
          <defs><linearGradient id="rw" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity=".18"/></linearGradient></defs>
          <path d="M120 500 L190 300 L210 300 L280 500 Z" fill="url(#rw)"/>
          <?php for ($i = 0; $i < 5; $i++): ?><rect x="198" y="<?= 315 + $i * 36 ?>" width="4" height="<?= 14 + $i * 4 ?>" fill="#fff" opacity=".5"/><?php endfor ?>
          <path d="M60 300 H340" stroke="#fff" stroke-opacity=".15"/>
          <g transform="translate(250 130) rotate(-12)" fill="#fff" opacity=".9"><path d="M0 8 L70 6 L90 0 L96 4 L80 10 L96 16 L90 20 L70 14 L0 12 Z"/><path d="M30 9 L18 -14 L26 -14 L50 9 Z M30 11 L18 34 L26 34 L50 11 Z"/></g>
        </svg>
        <div class="absolute inset-x-6 bottom-6 rounded-2xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md">
          <div class="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-navy-100"><span>Lounge Voucher</span><span>QRIS</span></div>
          <div class="mt-3 flex items-end justify-between">
            <div><div class="text-xs text-navy-100"><?= e(t('pricing.adult')) ?></div><div class="text-2xl font-semibold"><?= e(format_idr(PRICE_ADULT_IDR, $lang)) ?></div></div>
            <div class="text-right"><div class="text-xs text-navy-100"><?= e(t('pricing.child')) ?></div><div class="text-lg font-semibold"><?= e(format_idr(PRICE_CHILD_IDR, $lang)) ?></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="how" class="scroll-mt-20 bg-navy-50/60 py-20">
  <div class="container-page">
    <p class="eyebrow"><?= e(t('how.eyebrow')) ?></p>
    <h2 class="heading-display mt-3 text-3xl sm:text-4xl"><?= e(t('how.title')) ?></h2>
    <ol class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <?php foreach (t('how.steps') as $i => $s): ?>
      <li class="card p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
        <div class="flex items-center justify-between"><span class="grid size-11 place-items-center rounded-xl bg-navy-900 text-white"><?= icon($stepIcons[$i]) ?></span><span class="text-3xl font-semibold text-navy-100">0<?= $i + 1 ?></span></div>
        <h3 class="mt-5 font-semibold text-navy-900"><?= e($s['title']) ?></h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-600"><?= e($s['body']) ?></p>
      </li>
      <?php endforeach ?>
    </ol>
  </div>
</section>

<section class="py-20">
  <div class="container-page">
    <p class="eyebrow"><?= e(t('popular.eyebrow')) ?></p>
    <h2 class="heading-display mt-3 text-3xl sm:text-4xl"><?= e(t('popular.title')) ?></h2>
    <p class="mt-3 max-w-xl text-slate-600"><?= e(t('popular.subtitle')) ?></p>
    <ul class="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
      <?php foreach ($popular as [$iata, $city, $name]): ?>
      <li><a href="<?= e(url('book.php?q=' . rawurlencode("$name ($iata)"))) ?>" class="group block overflow-hidden rounded-2xl border border-navy-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-navy-700/20 hover:shadow-lift">
        <div class="flex items-start justify-between"><span class="text-2xl font-bold tracking-wider text-navy-900"><?= $iata ?></span><?= icon('plane', 'size-5 text-accent-600 transition group-hover:translate-x-0.5') ?></div>
        <p class="mt-6 font-semibold text-navy-900"><?= e($city) ?></p>
        <p class="text-sm text-slate-500"><?= e($name) ?></p>
        <span class="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-navy-700"><?= e(t('popular.view')) ?> <?= icon('right', 'size-3.5') ?></span>
      </a></li>
      <?php endforeach ?>
    </ul>
  </div>
</section>

<section class="bg-navy-900 py-20 text-white">
  <div class="container-page">
    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-accent-500"><?= e(t('why.eyebrow')) ?></p>
    <h2 class="mt-3 font-display text-3xl font-semibold sm:text-4xl"><?= e(t('why.title')) ?></h2>
    <div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <?php foreach (t('why.items') as $i => $w): ?>
      <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-6"><?= icon($whyIcons[$i], 'size-6 text-gold-500') ?><h3 class="mt-4 font-semibold"><?= e($w['title']) ?></h3><p class="mt-2 text-sm leading-relaxed text-slate-300"><?= e($w['body']) ?></p></div>
      <?php endforeach ?>
    </div>
  </div>
</section>

<section id="pricing" class="scroll-mt-20 py-20">
  <div class="container-page">
    <p class="eyebrow"><?= e(t('pricing.eyebrow')) ?></p>
    <h2 class="heading-display mt-3 text-3xl sm:text-4xl"><?= e(t('pricing.title')) ?></h2>
    <div class="mt-10 grid gap-5 md:grid-cols-2">
      <?php foreach ([[t('pricing.adult'), t('pricing.adultDesc'), PRICE_ADULT_IDR, true], [t('pricing.child'), t('pricing.childDesc'), PRICE_CHILD_IDR, false]] as [$label, $desc, $price, $featured]): ?>
      <div class="card p-7 <?= $featured ? 'ring-2 ring-navy-900' : '' ?>">
        <div class="flex items-center justify-between"><h3 class="text-lg font-semibold"><?= e($label) ?></h3><span class="badge bg-navy-50 text-navy-700"><?= e($desc) ?></span></div>
        <p class="mt-5"><span class="text-4xl font-bold tracking-tight"><?= e(format_idr($price, $lang)) ?></span><span class="ml-1 text-slate-500"><?= e(t('pricing.perVoucher')) ?></span></p>
        <ul class="mt-6 space-y-2 text-sm text-slate-600">
          <?php foreach (array_slice(t('singleEntry.bullets'), 0, 3) as $b): ?><li class="flex gap-2"><?= icon('check', 'mt-0.5 size-4 shrink-0 text-accent-600') ?> <?= e($b) ?></li><?php endforeach ?>
        </ul>
        <a href="#search" class="<?= $featured ? 'btn-navy' : 'btn-ghost' ?> mt-7 w-full"><?= e(t('pricing.cta')) ?></a>
      </div>
      <?php endforeach ?>
    </div>
    <div class="mt-8 space-y-4"><?= voucher_timing_notice() ?><?= single_entry_notice() ?></div>
  </div>
</section>

<section id="faq" class="scroll-mt-20 bg-navy-50/60 py-20">
  <div class="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr]">
    <div><p class="eyebrow"><?= e(t('faq.eyebrow')) ?></p><h2 class="heading-display mt-3 text-3xl sm:text-4xl"><?= e(t('faq.title')) ?></h2></div>
    <div class="space-y-3">
      <?php foreach (t('faq.items') as $f): ?>
      <details class="group card p-5 [&_summary::-webkit-details-marker]:hidden">
        <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-navy-900"><?= e($f['q']) ?><span class="grid size-7 shrink-0 place-items-center rounded-full bg-navy-50 text-navy-700 transition group-open:rotate-45">+</span></summary>
        <p class="mt-3 text-sm leading-relaxed text-slate-600"><?= e($f['a']) ?></p>
      </details>
      <?php endforeach ?>
    </div>
  </div>
</section>

<section id="support" class="scroll-mt-20 py-20">
  <div class="container-page">
    <div class="flex flex-col items-start gap-6 rounded-3xl bg-gradient-to-br from-navy-900 to-navy-800 p-8 text-white shadow-lift sm:p-12 md:flex-row md:items-center md:justify-between">
      <div class="max-w-xl">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-accent-500"><?= e(t('support.eyebrow')) ?></p>
        <h2 class="mt-3 font-display text-3xl font-semibold"><?= e(t('support.title')) ?></h2>
        <p class="mt-3 text-slate-300"><?= e(t('support.body')) ?></p>
      </div>
      <a href="<?= e(whatsapp_link(t('support.waMessage'))) ?>" target="_blank" rel="noopener noreferrer" class="btn bg-[#1fa855] px-6 text-white hover:bg-[#178c46]"><?= icon('whatsapp', 'size-5') ?> <?= e(t('support.button')) ?></a>
    </div>
  </div>
</section>
<?php page_end();
