<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require APP_ROOT . '/templates/layout.php';

$lounge = get_active_lounge((string) ($_GET['id'] ?? ''));
if (!$lounge) {
    http_response_code(404);
    require __DIR__ . '/404.php';
    exit;
}
$lang = current_lang();
$id = rawurlencode($lounge['id']);
$rows = [
    [t('lounge.terminal'), $lounge['terminal']], [t('lounge.location'), $lounge['location']], [t('lounge.hours'), $lounge['openingHours']],
    [t('lounge.access'), $lounge['accessInfo']], [t('lounge.conditions'), $lounge['conditions']],
];
page_start($lounge['name']);
?>
<div class="container-page py-10 sm:py-14">
  <a href="<?= e(url('airport.php?iata=' . $lounge['airportIata'])) ?>" class="inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:text-navy-900"><?= icon('left', 'size-4') ?> <?= e(t('lounge.back')) ?></a>
  <div class="mt-6 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
    <div class="min-w-0">
      <p class="eyebrow"><?= e($lounge['airport']['name']) ?> (<?= e($lounge['airport']['iata']) ?>)</p>
      <h1 class="heading-display mt-2 text-3xl sm:text-4xl"><?= e($lounge['name']) ?></h1>
      <?php if ($lounge['images']): ?>
      <div class="mt-6 grid grid-cols-2 gap-3">
        <?php foreach (array_slice($lounge['images'], 0, 4) as $i => $src): ?>
        <img src="<?= e($src) ?>" alt="<?= e($lounge['name'] . ' ' . ($i + 1)) ?>" referrerpolicy="no-referrer" class="w-full rounded-2xl object-cover <?= $i === 0 ? 'col-span-2 aspect-[16/8]' : 'aspect-[4/3]' ?>">
        <?php endforeach ?>
      </div>
      <?php endif ?>
      <section class="mt-8"><h2 class="text-lg font-semibold"><?= e(t('lounge.description')) ?></h2><p class="mt-2 leading-relaxed text-slate-600"><?= value_or_unavailable($lounge['description'], true) ?></p></section>
      <section class="mt-8"><h2 class="text-lg font-semibold"><?= e(t('lounge.facilities')) ?></h2>
        <?php if ($lounge['facilities']): ?>
        <ul class="mt-3 grid gap-2 sm:grid-cols-2"><?php foreach ($lounge['facilities'] as $f): ?><li class="flex items-center gap-2 text-sm text-navy-800"><?= icon('check', 'size-4 text-accent-600') ?> <?= e($f) ?></li><?php endforeach ?></ul>
        <?php else: ?><p class="mt-2 text-sm"><?= unavailable() ?></p><?php endif ?>
      </section>
      <dl class="mt-8 divide-y divide-navy-100 rounded-2xl border border-navy-100">
        <?php foreach ($rows as [$k, $v]): ?>
        <div class="grid gap-1 p-4 sm:grid-cols-[180px_1fr]"><dt class="text-sm font-medium text-slate-500"><?= e($k) ?></dt><dd class="text-sm text-navy-900"><?= value_or_unavailable($v, true) ?></dd></div>
        <?php endforeach ?>
      </dl>
    </div>
    <aside class="lg:sticky lg:top-24 lg:self-start">
      <div class="card space-y-4 p-6">
        <?= notice(e(t('lounge.disclaimer'))) ?>
        <p class="text-xs text-slate-500"><?= e(t('lounge.source')) ?>: <?= e($lounge['source'] === 'LOUNGEKEY' ? t('lounge.sourceLoungeKey') : t('lounge.sourceManual')) ?><?= $lounge['fetchedAt'] ? ' · ' . e(date('d/m/Y', (int) $lounge['fetchedAt'])) : '' ?></p>
        <a href="<?= e(url("book.php?lounge=$id")) ?>" class="btn-primary w-full"><?= e(t('lounge.select')) ?> <?= icon('right', 'size-4') ?></a>
      </div>
    </aside>
  </div>
</div>
<?php page_end();
