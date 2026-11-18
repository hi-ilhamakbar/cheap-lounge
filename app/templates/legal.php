<?php
declare(strict_types=1);

function legal_page(string $title, string $updated, array $sections): void
{
    page_start($title);
    echo '<div class="container-page max-w-3xl py-12 sm:py-16"><h1 class="heading-display text-3xl sm:text-4xl">' . e($title) . '</h1><p class="mt-2 text-sm text-slate-500">' . e($updated) . '</p><div class="mt-8 space-y-8">';
    foreach ($sections as [$h, $paras]) {
        echo '<section><h2 class="text-lg font-semibold text-navy-900">' . e($h) . '</h2>';
        foreach ($paras as $p) echo '<p class="mt-2 leading-relaxed text-slate-700">' . e($p) . '</p>';
        echo '</section>';
    }
    echo '</div></div>';
    page_end();
}
