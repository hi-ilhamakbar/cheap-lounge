<?php
declare(strict_types=1);
if (!defined('APP_ROOT')) {
    require __DIR__ . '/app/bootstrap.php';
    http_response_code(404);
}
require_once APP_ROOT . '/templates/layout.php';
page_start('404', ['noindex' => true]);
?>
<div class="container-page max-w-xl py-24 text-center">
  <p class="eyebrow">404</p>
  <h1 class="heading-display mt-3 text-3xl">Halaman tidak ditemukan · Page not found</h1>
  <a href="<?= e(url('')) ?>" class="btn-navy mt-8">Beranda · Home</a>
</div>
<?php page_end();
