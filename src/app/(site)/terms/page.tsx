import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { LegalPage } from "@/components/ProseSection";
import { WHATSAPP_DISPLAY } from "@/lib/business";

export const metadata: Metadata = { title: "Terms & Conditions" };

// NOTE: business-provided draft — have it reviewed by the business owner / legal counsel before launch.
const CONTENT = {
  id: {
    updated: "Draf — perlu ditinjau oleh pemilik usaha sebelum diluncurkan.",
    sections: [
      { h: "1. Layanan", p: ["JASA TIKET MURAH menjual voucher akses airport lounge. Informasi lounge ditampilkan dari sumber data LoungeKey resmi dan bukan merupakan konfirmasi ketersediaan."] },
      { h: "2. Harga", p: ["Voucher dewasa (usia 12 tahun ke atas) Rp 200.000 dan voucher anak (di bawah 12 tahun) Rp 175.000 per penumpang. Total dihitung ulang oleh sistem kami."] },
      { h: "3. Voucher sekali masuk", p: ["Setiap voucher hanya berlaku untuk SATU KALI MASUK bagi satu penumpang. Voucher tidak dapat digunakan ulang, bukan keanggotaan, dan tidak memberikan akses tanpa batas. Masuk kembali memerlukan voucher baru."] },
      { h: "4. Data penumpang", p: ["Nama penumpang wajib sesuai tiket pesawat atau dokumen perjalanan. Kesalahan nama dapat menyebabkan akses ditolak oleh lounge."] },
      { h: "5. Pembayaran", p: ["Pembayaran dilakukan melalui QRIS JASA TIKET MURAH (NMID ID1025423279625). Pesanan diproses setelah pembayaran diverifikasi oleh tim kami. Mengunggah bukti pembayaran tidak otomatis berarti pembayaran telah diterima."] },
      { h: "6. Akses lounge", p: ["Akses tunduk pada ketentuan, jam operasional, kapasitas, aturan berpakaian, dan kebijakan masing-masing lounge, serta mungkin memerlukan boarding pass yang valid pada hari kunjungan."] },
      { h: "7. Pembatalan & pengembalian dana", p: ["Kebijakan pembatalan dan pengembalian dana ditetapkan oleh JASA TIKET MURAH. Hubungi kami melalui WhatsApp " + WHATSAPP_DISPLAY + " untuk bantuan."] },
    ],
  },
  en: {
    updated: "Draft — to be reviewed by the business owner before launch.",
    sections: [
      { h: "1. Service", p: ["JASA TIKET MURAH sells airport lounge access vouchers. Lounge information is shown from an authorized LoungeKey data source and is not a confirmation of availability."] },
      { h: "2. Pricing", p: ["Adult vouchers (aged 12 and above) cost IDR 200,000 and child vouchers (under 12) cost IDR 175,000 per passenger. Totals are recalculated by our system."] },
      { h: "3. Single-entry vouchers", p: ["Each voucher is valid for a SINGLE ENTRY for one passenger only. Vouchers cannot be reused, are not a membership, and do not provide unlimited access. Re-entry requires a new voucher."] },
      { h: "4. Passenger details", p: ["Passenger names must match the flight ticket or travel document. Incorrect names may result in the lounge refusing access."] },
      { h: "5. Payment", p: ["Payment is made via the JASA TIKET MURAH QRIS (NMID ID1025423279625). Orders are processed after our team verifies the payment. Uploading payment proof does not by itself mean payment has been received."] },
      { h: "6. Lounge access", p: ["Access is subject to each lounge's conditions, opening hours, capacity, dress code and policies, and may require a valid boarding pass on the day of the visit."] },
      { h: "7. Cancellation & refunds", p: ["Cancellation and refund policies are set by JASA TIKET MURAH. Contact us on WhatsApp " + WHATSAPP_DISPLAY + " for assistance."] },
    ],
  },
};

export default async function TermsPage() {
  const { t, lang } = await getDict();
  return <LegalPage title={t.terms.title} {...CONTENT[lang]} />;
}
