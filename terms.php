<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require APP_ROOT . '/templates/layout.php';
require APP_ROOT . '/templates/legal.php';

// NOTE: draft — have it reviewed by the business owner / legal counsel before launch.
$wa = WHATSAPP_DISPLAY;
$content = [
    'id' => ['Draf — perlu ditinjau oleh pemilik usaha sebelum diluncurkan.', [
        ['1. Layanan', ['JASA TIKET MURAH menjual voucher akses airport lounge. Pelanggan menuliskan bandara dan lounge yang diinginkan; ketersediaan lounge dikonfirmasi oleh tim kami melalui email atau WhatsApp.']],
        ['2. Harga', ['Voucher dewasa (usia 12 tahun ke atas) Rp 200.000 dan voucher anak (di bawah 12 tahun) Rp 175.000 per penumpang. Total dihitung ulang oleh sistem kami.']],
        ['3. Voucher sekali masuk', ['Setiap voucher hanya berlaku untuk SATU KALI MASUK bagi satu penumpang. Voucher tidak dapat digunakan ulang, bukan keanggotaan, dan tidak memberikan akses tanpa batas. Masuk kembali memerlukan voucher baru.']],
        ['4. Data penumpang', ['Nama penumpang wajib sesuai tiket pesawat atau dokumen perjalanan. Kesalahan nama dapat menyebabkan akses ditolak oleh lounge.']],
        ['5. Pembayaran', ['Pembayaran dilakukan melalui QRIS JASA TIKET MURAH (NMID ' . QRIS_NMID . '). Pesanan diproses setelah pembayaran diverifikasi oleh tim kami. Mengunggah bukti pembayaran tidak otomatis berarti pembayaran telah diterima.']],
        ['6. Akses lounge', ['Akses tunduk pada ketentuan, jam operasional, kapasitas, aturan berpakaian, dan kebijakan masing-masing lounge, serta mungkin memerlukan boarding pass yang valid pada hari kunjungan.']],
        ['7. Pembatalan & pengembalian dana', ["Kebijakan pembatalan dan pengembalian dana ditetapkan oleh JASA TIKET MURAH. Hubungi kami melalui WhatsApp $wa untuk bantuan."]],
        ['8. Pengiriman voucher lounge', ['Voucher airport lounge dikirim melalui email / WhatsApp paling lambat pada hari H keberangkatan.']],
        ['9. Dummy ticket', ['Dummy ticket adalah reservasi tiket pesawat untuk pengajuan visa atau syarat perjalanan. Harga Rp 100.000 per orang per rute (sekali jalan Rp 100.000, pulang pergi Rp 200.000), sama untuk dewasa, anak, dan bayi.', 'Maskapai pilihan akan diusahakan; jika tidak memungkinkan, maskapai dipilihkan secara acak. Masa berlaku (time limit) reservasi tergantung maskapai dan tidak dapat dipilih.']],
        ['10. Dummy hotel', ['Dummy hotel adalah reservasi hotel untuk pengajuan visa. Harga Rp 100.000 per orang per hotel untuk dewasa dan anak; bayi gratis. 1 kamar maksimal 2 dewasa + 1 bayi, atau 1 dewasa + 1 anak + 1 bayi.', 'Hotel pilihan akan diusahakan; jika tidak memungkinkan, hotel dipilihkan secara acak.']],
    ]],
    'en' => ['Draft — to be reviewed by the business owner before launch.', [
        ['1. Service', ['JASA TIKET MURAH sells airport lounge access vouchers. Customers write the airport and lounge they want; our team confirms lounge availability by email or WhatsApp.']],
        ['2. Pricing', ['Adult vouchers (aged 12 and above) cost IDR 200,000 and child vouchers (under 12) cost IDR 175,000 per passenger. Totals are recalculated by our system.']],
        ['3. Single-entry vouchers', ['Each voucher is valid for a SINGLE ENTRY for one passenger only. Vouchers cannot be reused, are not a membership, and do not provide unlimited access. Re-entry requires a new voucher.']],
        ['4. Passenger details', ['Passenger names must match the flight ticket or travel document. Incorrect names may result in the lounge refusing access.']],
        ['5. Payment', ['Payment is made via the JASA TIKET MURAH QRIS (NMID ' . QRIS_NMID . '). Orders are processed after our team verifies the payment. Uploading payment proof does not by itself mean payment has been received.']],
        ['6. Lounge access', ["Access is subject to each lounge's conditions, opening hours, capacity, dress code and policies, and may require a valid boarding pass on the day of the visit."]],
        ['7. Cancellation & refunds', ["Cancellation and refund policies are set by JASA TIKET MURAH. Contact us on WhatsApp $wa for assistance."]],
        ['8. Lounge voucher delivery', ['Airport lounge vouchers are sent by email / WhatsApp no later than the departure day (day D).']],
        ['9. Dummy ticket', ['A dummy ticket is a flight reservation for visa applications or travel requirements. Price IDR 100,000 per person per route (one way IDR 100,000, round trip IDR 200,000), the same for adults, children and infants.', 'We try to use your preferred airline; if not possible, the airline is chosen at random. The reservation time limit depends on the airline and cannot be chosen.']],
        ['10. Dummy hotel', ['A dummy hotel is a hotel reservation for visa applications. Price IDR 100,000 per person per hotel for adults and children; infants are free. 1 room holds at most 2 adults + 1 infant, or 1 adult + 1 child + 1 infant.', 'We try to book your preferred hotel; if not possible, the hotel is chosen at random.']],
    ]],
];
[$updated, $sections] = $content[current_lang()];
legal_page(t('terms.title'), $updated, $sections);
