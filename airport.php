<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require APP_ROOT . '/templates/layout.php';

// Without JavaScript the search form submits ?q=… — resolve it to an airport code.
$iata = strtoupper(trim((string) ($_GET['iata'] ?? '')));
if ($iata === '' && isset($_GET['q'])) {
    $hits = search_local_airports((string) $_GET['q'], 1);
    if ($hits) {
        header('Location: ' . url('airport.php?iata=' . $hits[0]['iata']), true, 302);
        exit;
    }
}

try {
    $result = get_lounges_for_airport($iata);
} catch (Throwable $e) {
    log_event('error', 'airport_page_failed', ['iata' => $iata, 'error' => $e->getMessage()]);
    $result = ['status' => 'error'];
}
if ($result['status'] === 'airport_not_found') http_response_code(404);

$wa = '<a class="font-semibold underline" href="' . e(whatsapp_link(t('support.waMessage'))) . '" target="_blank" rel="noopener noreferrer">' . e(t('support.button')) . '</a>';
page_start($iata ? "Lounges $iata" : 'Lounges');
?>
<div class="container-page py-10 sm:py-14">
  <a href="<?= e(url('') . '#search') ?>" class="inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:text-navy-900"><?= icon('left', 'size-4') ?> <?= e(t('lounge.changeAirport')) ?></a>

  <?php if ($result['status'] === 'ok'): $a = $result['airport']; ?>
  <header class="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <p class="eyebrow"><?= e(t('lounge.titleAt')) ?></p>
      <h1 class="heading-display mt-2 text-3xl sm:text-4xl"><?= e($a['name']) ?> <span class="text-slate-400">(<?= e($a['iata']) ?>)</span></h1>
      <p class="mt-2 text-slate-600"><?= e(implode(', ', array_filter([$a['city'], $a['country']]))) ?> · <?= count($result['lounges']) ?> <?= e(t('lounge.found')) ?></p>
    </div>
    <div class="w-full lg:max-w-md"><?= airport_search('md') ?></div>
  </header>
  <div class="mt-6"><?= notice(e(t('lounge.disclaimer'))) ?></div>
  <?php if (!empty($result['stale'])): ?><div class="mt-3"><?= notice(e(t('lounge.error')), 'warn') ?></div><?php endif ?>
  <?php if (!$result['lounges']): ?>
    <div class="mt-8"><?= notice('<p>' . e(t('lounge.none')) . '</p>' . $wa, 'warn') ?></div>
  <?php else: ?>
    <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <?php foreach ($result['lounges'] as $l) echo lounge_card($l); ?>
    </div>
  <?php endif ?>
  <?php else:
      $msg = match ($result['status']) { 'airport_not_found' => t('lounge.airportNotFound'), 'not_configured' => t('lounge.unavailable'), default => t('lounge.error') };
      $retry = $result['status'] === 'error' ? '<a class="font-semibold underline" href="' . e(url('airport.php?iata=' . rawurlencode($iata))) . '">' . e(t('lounge.retry')) . '</a> ' : '';
  ?>
  <div class="mx-auto mt-10 max-w-xl space-y-6">
    <?= airport_search('md') ?>
    <?= notice('<p>' . e($msg) . '</p><p class="flex flex-wrap gap-4">' . $retry . $wa . '</p>', $result['status'] === 'airport_not_found' ? 'warn' : 'error') ?>
  </div>
  <?php endif ?>
</div>
<?php page_end();
