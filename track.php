<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require APP_ROOT . '/templates/layout.php';

page_start(t('track.title'));
?>
<div class="container-page max-w-xl py-16">
  <h1 class="heading-display text-3xl"><?= e(t('track.title')) ?></h1>
  <div class="mt-6"><?= notice('<p>' . e(t('track.body')) . '</p><a class="font-semibold underline" href="' . e(whatsapp_link(t('support.waMessage'))) . '" target="_blank" rel="noopener noreferrer">' . e(t('support.button')) . '</a>') ?></div>
</div>
<?php page_end();
