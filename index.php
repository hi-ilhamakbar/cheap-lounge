<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require APP_ROOT . '/templates/layout.php';

$lang = current_lang();
$services = [
    'lounge' => ['url' => 'airport-lounge.php', 'icon' => 'ticket', 'accent' => 'from-navy-800 to-navy-950'],
    'ticket' => ['url' => 'dummy-ticket.php', 'icon' => 'plane', 'accent' => 'from-[#1d3b8f] to-navy-950'],
    'hotel' => ['url' => 'dummy-hotel.php', 'icon' => 'hotel', 'accent' => 'from-[#7a1d2a] to-navy-950'],
];
page_start();
?>
<section class="relative overflow-hidden">
  <div aria-hidden="true" class="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_-10%,#e6eaf4_0%,transparent_60%),radial-gradient(40rem_20rem_at_0%_110%,#fdf1f2_0%,transparent_60%)]"></div>
  <div class="container-page relative pb-10 pt-14 text-center sm:pt-20">
    <span class="badge border border-navy-100 bg-white text-navy-700 shadow-sm"><span class="size-1.5 rounded-full bg-accent-600"></span> <?= e(t('home.badge')) ?></span>
    <h1 class="heading-display mx-auto mt-6 max-w-3xl text-4xl leading-[1.1] sm:text-5xl lg:text-[3.4rem]"><?= e(t('home.title')) ?></h1>
    <p class="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg"><?= e(t('home.subtitle')) ?></p>
  </div>
</section>

<section id="services" class="scroll-mt-24 pb-20">
  <div class="container-page">
    <div class="mb-8 text-center"><p class="eyebrow"><?= e(t('home.servicesEyebrow')) ?></p><h2 class="heading-display mt-2 text-2xl sm:text-3xl"><?= e(t('home.servicesTitle')) ?></h2></div>
    <div class="grid gap-6 md:grid-cols-3">
      <?php foreach ($services as $key => $s): $sv = t("home.services.$key"); ?>
      <a href="<?= e(url($s['url'])) ?>" class="group flex flex-col overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift">
        <div class="relative h-36 overflow-hidden bg-gradient-to-br <?= $s['accent'] ?>">
          <div aria-hidden="true" class="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(201,164,92,.35),transparent_50%)]"></div>
          <div aria-hidden="true" class="absolute -bottom-10 -right-6 size-40 rounded-full border border-white/10"></div>
          <div aria-hidden="true" class="absolute -bottom-16 -right-12 size-56 rounded-full border border-white/10"></div>
          <span class="absolute left-6 top-6 grid size-12 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur"><?= icon($s['icon'], 'size-6') ?></span>
          <span class="absolute bottom-5 left-6 text-xl font-semibold text-white"><?= e($sv['title']) ?></span>
        </div>
        <div class="flex flex-1 flex-col p-6">
          <p class="text-sm leading-relaxed text-slate-600"><?= e($sv['desc']) ?></p>
          <p class="mt-5"><span class="text-xs text-slate-500"><?= e(t('home.from')) ?></span> <span class="text-2xl font-bold tracking-tight text-navy-900"><?= e($sv['price']) ?></span> <span class="text-sm text-slate-500"><?= e($sv['unit']) ?></span></p>
          <ul class="mt-4 space-y-2 text-sm text-slate-700">
            <?php foreach ($sv['points'] as $pt): ?><li class="flex gap-2"><?= icon('check', 'mt-0.5 size-4 shrink-0 text-accent-600') ?><?= e($pt) ?></li><?php endforeach ?>
          </ul>
          <div class="mt-auto pt-6"><span class="btn-primary w-full group-hover:bg-accent-700"><?= e($sv['cta']) ?> <?= icon('right', 'size-4 transition group-hover:translate-x-0.5') ?></span></div>
        </div>
      </a>
      <?php endforeach ?>
    </div>
  </div>
</section>

<section class="bg-navy-50/60 py-20">
  <div class="container-page">
    <p class="eyebrow"><?= e(t('how.eyebrow')) ?></p>
    <h2 class="heading-display mt-3 text-3xl sm:text-4xl"><?= e(t('home.howTitle')) ?></h2>
    <ol class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <?php foreach (t('home.steps') as $i => $st): ?>
      <li class="card p-6">
        <div class="flex items-center justify-between"><span class="grid size-11 place-items-center rounded-xl bg-navy-900 text-white"><?= icon(['search', 'users', 'qr', 'mail'][$i]) ?></span><span class="text-3xl font-semibold text-navy-100">0<?= $i + 1 ?></span></div>
        <h3 class="mt-5 font-semibold text-navy-900"><?= e($st['title']) ?></h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-600"><?= e($st['body']) ?></p>
      </li>
      <?php endforeach ?>
    </ol>
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
