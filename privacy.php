<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require APP_ROOT . '/templates/layout.php';
require APP_ROOT . '/templates/legal.php';

$content = [
    'id' => ['Draf — perlu ditinjau oleh pemilik usaha sebelum diluncurkan.', [
        ['Data yang kami kumpulkan', ['Nomor WhatsApp, alamat email, nama pemesan (opsional), nama penumpang, detail lounge dan tanggal kunjungan, serta bukti pembayaran yang Anda unggah.']],
        ['Penggunaan data', ['Data digunakan hanya untuk memproses pesanan, memverifikasi pembayaran, menerbitkan voucher, dan menghubungi Anda terkait pesanan. Salinan konfirmasi pesanan dikirim ke email internal JASA TIKET MURAH.']],
        ['Penyimpanan & keamanan', ['Situs ini tidak menyimpan pesanan di basis data. Data pesanan dan bukti pembayaran dikirim melalui email ke Anda dan ke email internal JASA TIKET MURAH, dan hanya dapat diakses oleh staf yang berwenang. Tautan halaman pesanan dienkripsi.']],
        ['Hak Anda', ['Anda dapat meminta akses, koreksi, atau penghapusan data Anda dengan menghubungi kami melalui WhatsApp atau email.']],
    ]],
    'en' => ['Draft — to be reviewed by the business owner before launch.', [
        ['Data we collect', ['WhatsApp number, email address, your name (optional), passenger names, lounge and visit date details, and any payment proof you upload.']],
        ['How we use it', ["Only to process your order, verify payment, issue vouchers and contact you about your order. A copy of the order confirmation is sent to JASA TIKET MURAH's internal email addresses."]],
        ['Storage & security', ["This website does not store orders in a database. Order details and payment proofs are sent by email to you and to JASA TIKET MURAH's internal addresses, and are accessible only to authorized staff. Order page links are encrypted."]],
        ['Your rights', ['You may request access to, correction of, or deletion of your data by contacting us on WhatsApp or by email.']],
    ]],
];
[$updated, $sections] = $content[current_lang()];
legal_page(t('privacy.title'), $updated, $sections);
