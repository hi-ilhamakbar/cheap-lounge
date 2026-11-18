<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require APP_ROOT . '/templates/layout.php';

header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, nofollow');
$code = (string) ($_GET['code'] ?? '');
$token = (string) ($_GET['d'] ?? '');
try {
    $order = read_order($code, $token);
} catch (Throwable $e) {
    log_event('error', 'order_page_failed', ['error' => $e->getMessage()]);
    $order = null;
}
$lang = current_lang();
if (!$order) http_response_code(404);
page_start(t('order.title'), ['noindex' => true, 'noReferrer' => true]);

if (!$order): ?>
<div class="container-page max-w-xl py-16">
  <?= notice('<p>' . e(t('order.notFound')) . '</p><a class="font-semibold underline" href="' . e(whatsapp_link(t('support.waMessage'))) . '" target="_blank" rel="noopener noreferrer">' . e(t('support.button')) . '</a>', 'error') ?>
</div>
<?php page_end(); exit; endif;

$p = $order['price'];
$amount = format_idr($p['totalAmount'], $lang);
$details = array_filter([
    $order['customer']['name'] ? [preg_replace('/ \(.*\)$/', '', t('booking.customerName')), $order['customer']['name']] : null,
    [t('booking.whatsapp'), $order['customer']['whatsapp']],
    [t('booking.email'), $order['customer']['email']],
    [t('booking.airport'), "{$order['airport']['name']} ({$order['airport']['iata']})"],
    [t('booking.lounge'), $order['lounge']['name']],
    [t('lounge.terminal'), $order['lounge']['terminal'] ?? t('lounge.infoUnavailable')],
    [t('booking.visitDate'), format_visit_date($order['visitDate'], $lang)],
    [t('booking.adults'), (string) $p['adultQty']],
    [t('booking.children'), (string) $p['childQty']],
]);
?>
<div class="container-page py-10 sm:py-14" data-order-code="<?= e($order['code']) ?>" data-order-token="<?= e($token) ?>">
  <p class="eyebrow"><?= e(t('order.title')) ?></p>
  <h1 class="heading-display mt-2 text-2xl sm:text-3xl"><?= e(t('order.orderId')) ?>: <span class="font-mono tracking-wide"><?= e($order['code']) ?></span></h1>
  <div class="mt-6"><?= notice(e(t('order.emailSent')) . ' <strong>' . e($order['customer']['email']) . '</strong>.') ?></div>

  <div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
    <section class="card min-w-0 p-5 sm:p-7">
      <p class="text-lg font-semibold text-navy-900"><?= e(t('order.scanInstruction')) ?></p>
      <div class="mt-5 rounded-2xl bg-navy-50 p-4 sm:p-5">
        <p class="text-sm text-slate-600"><?= e(t('order.amountLabel')) ?></p>
        <div class="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p class="text-3xl font-bold tracking-tight text-navy-900 tabular-nums sm:text-4xl"><?= e($amount) ?></p>
          <button type="button" class="btn-ghost px-4 py-2" data-copy="<?= (int) $p['totalAmount'] ?>"><?= icon('copy', 'size-4') ?> <span data-copy-label><?= e(t('order.copyAmount')) ?></span></button>
        </div>
        <p class="mt-2 text-xs text-slate-500"><?= e(t('order.amountNote')) ?></p>
      </div>

      <!-- Original QRIS image — shown unmodified, nothing overlaid, aspect ratio preserved. -->
      <figure class="mx-auto mt-6 w-full max-w-[360px]" data-no-overlay>
        <img src="<?= e(url(QRIS_IMAGE)) ?>" width="<?= QRIS_WIDTH ?>" height="<?= QRIS_HEIGHT ?>" alt="QRIS <?= e(QRIS_MERCHANT) ?> — NMID <?= e(QRIS_NMID) ?>" class="h-auto w-full rounded-xl border border-navy-100 bg-white">
        <figcaption class="mt-3 text-center text-xs text-slate-500">
          <?= e(t('order.merchant')) ?>: <?= e(QRIS_MERCHANT) ?> · NMID <?= e(QRIS_NMID) ?> · <?= e(QRIS_CATEGORY) ?><br>
          <a href="<?= e(url(QRIS_IMAGE)) ?>" download class="font-semibold text-navy-700 underline"><?= e(t('order.downloadQris')) ?></a>
        </figcaption>
      </figure>

      <div class="mt-6">
        <h2 class="font-semibold"><?= e(t('order.howToPay')) ?></h2>
        <ol class="mt-3 space-y-2 text-sm text-slate-700">
          <?php foreach (t('order.paySteps') as $i => $s): ?>
          <li class="flex gap-3"><span class="grid size-6 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white"><?= $i + 1 ?></span><?= e($s) ?></li>
          <?php endforeach ?>
        </ol>
      </div>
      <div class="mt-6"><?= single_entry_notice() ?></div>

      <div class="mt-8 border-t border-navy-100 pt-6">
        <h2 class="font-semibold"><?= e(t('order.uploadTitle')) ?></h2>
        <p class="mt-1 text-sm text-slate-600"><?= e(t('order.uploadBody')) ?></p>
        <div class="mt-4 hidden space-y-3" data-proof-done>
          <?= notice(e(t('order.proofSubmitted'))) ?>
          <button type="button" class="text-sm font-semibold text-navy-700 underline" data-send-another><?= e(t('order.sendAnother')) ?></button>
        </div>
        <form class="mt-4 space-y-4" enctype="multipart/form-data" data-proof-form>
          <div>
            <label for="proof" class="field-label"><?= e(t('order.proofFile')) ?> *</label>
            <label for="proof" class="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-navy-100 px-4 py-5 text-sm text-slate-600 transition hover:border-navy-700/40">
              <?= icon('upload', 'size-5 text-navy-700') ?><span class="truncate" data-file-name><?= e(t('order.proofFile')) ?></span>
            </label>
            <input id="proof" name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" class="sr-only">
          </div>
          <div><label for="payerName" class="field-label"><?= e(t('order.payerName')) ?></label><input id="payerName" name="payerName" class="field-input" maxlength="100"></div>
          <div><label for="note" class="field-label"><?= e(t('order.note')) ?></label><textarea id="note" name="note" rows="2" maxlength="500" class="field-input"></textarea></div>
          <div class="hidden" data-proof-error><?= notice('<span data-msg></span>', 'error') ?></div>
          <button type="submit" class="btn-primary w-full"><?= e(t('order.submitProof')) ?></button>
        </form>
      </div>
    </section>

    <section class="min-w-0 space-y-6">
      <div class="card p-5 sm:p-7">
        <div class="flex items-center justify-between gap-3"><h2 class="font-semibold"><?= e(t('order.timeline')) ?></h2><?= status_badge('PENDING_PAYMENT') ?></div>
        <ol class="mt-4 space-y-3">
          <?php foreach ([t('order.stepCreated'), t('order.stepProof'), t('order.stepVerify')] as $i => $s): ?>
          <li class="flex items-center gap-3 text-sm" data-flow="<?= $i ?>">
            <span class="grid size-6 place-items-center rounded-full text-xs <?= $i === 0 ? 'bg-navy-900 text-white' : ($i === 1 ? 'bg-accent-600 text-white' : 'bg-navy-100 text-slate-400') ?>"><?= $i === 0 ? icon('check', 'size-3.5') : $i + 1 ?></span>
            <span class="<?= $i <= 1 ? 'font-medium text-navy-900' : 'text-slate-400' ?>"><?= e($s) ?></span>
          </li>
          <?php endforeach ?>
        </ol>
        <p class="mt-4 text-xs text-slate-500"><?= e(t('order.verifyNote')) ?></p>
      </div>

      <div class="card p-5 sm:p-7">
        <h2 class="font-semibold"><?= e(t('order.details')) ?></h2>
        <dl class="mt-4 space-y-2 text-sm">
          <?php foreach ($details as [$k, $v]): ?>
          <div class="grid grid-cols-[130px_1fr] gap-3 sm:grid-cols-[160px_1fr]"><dt class="text-slate-500"><?= e($k) ?></dt><dd class="break-words font-medium"><?= e($v) ?></dd></div>
          <?php endforeach ?>
        </dl>
        <div class="mt-5 space-y-3">
          <?php if ($order['adultNames']): ?>
          <div><p class="text-xs font-bold tracking-[0.14em] text-navy-700"><?= e(t('booking.adultSection')) ?></p><ol class="mt-1.5 list-decimal pl-5 text-sm"><?php foreach ($order['adultNames'] as $n): ?><li><?= e($n) ?></li><?php endforeach ?></ol></div>
          <?php endif; if ($order['childNames']): ?>
          <div><p class="text-xs font-bold tracking-[0.14em] text-accent-700"><?= e(t('booking.childSection')) ?></p><ol class="mt-1.5 list-decimal pl-5 text-sm"><?php foreach ($order['childNames'] as $n): ?><li><?= e($n) ?></li><?php endforeach ?></ol></div>
          <?php endif ?>
        </div>
        <dl class="mt-5 space-y-2 border-t border-navy-100 pt-4 text-sm">
          <?php if ($p['adultQty']): ?><div class="flex justify-between"><dt class="text-slate-600"><?= e(t('booking.adultLine') . " {$p['adultQty']} × " . format_idr($p['adultUnitPrice'], $lang)) ?></dt><dd class="tabular-nums"><?= e(format_idr($p['adultSubtotal'], $lang)) ?></dd></div><?php endif ?>
          <?php if ($p['childQty']): ?><div class="flex justify-between"><dt class="text-slate-600"><?= e(t('booking.childLine') . " {$p['childQty']} × " . format_idr($p['childUnitPrice'], $lang)) ?></dt><dd class="tabular-nums"><?= e(format_idr($p['childSubtotal'], $lang)) ?></dd></div><?php endif ?>
          <div class="flex justify-between pt-1 text-base font-bold"><dt><?= e(t('booking.total')) ?></dt><dd class="tabular-nums"><?= e($amount) ?></dd></div>
        </dl>
      </div>
      <p class="text-xs text-slate-500"><?= e(t('order.bookmark')) ?></p>
    </section>
  </div>
</div>
<?php page_end();
